import { db, defaultCategories, uid, type Category, type Transaction } from '../db'
import { centsToInput, formatDate, parseMoney, todayISO } from './format'

const BACKUP_VERSION = 1
const TABLES = ['categories', 'transactions', 'budgets', 'recurring', 'goals', 'contributions'] as const

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---- JSON: cópia de segurança completa ----

export async function exportJSON() {
  const data: Record<string, unknown> = { app: 'organizacao-financeira', version: BACKUP_VERSION, exportedAt: new Date().toISOString() }
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  download(`financas-backup-${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json')
}

/** Substitui todos os dados pelos do ficheiro. */
export async function importJSON(text: string) {
  const data = JSON.parse(text)
  if (data?.app !== 'organizacao-financeira' || !Array.isArray(data.transactions)) {
    throw new Error('Este ficheiro não é uma cópia de segurança desta app.')
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      if (Array.isArray(data[t])) await db.table(t).bulkAdd(data[t])
    }
  })
}

// ---- CSV: movimentos, no formato que o Excel português abre diretamente ----

const SEP = ';'
const HEADER = ['Data', 'Tipo', 'Categoria', 'Valor', 'Nota']

const csvCell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export async function exportCSV() {
  const [txs, cats] = await Promise.all([db.transactions.orderBy('date').toArray(), db.categories.toArray()])
  const byId = new Map(cats.map((c) => [c.id, c.name]))
  const rows = txs.map((t) =>
    [formatDate(t.date), t.type, byId.get(t.categoryId) ?? '', centsToInput(t.amount), t.note].map(csvCell).join(SEP),
  )
  // O BOM no início faz o Excel reconhecer os acentos.
  download(`financas-movimentos-${todayISO()}.csv`, '﻿' + [HEADER.join(SEP), ...rows].join('\r\n'), 'text/csv;charset=utf-8')
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const sep = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ','
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

/** Converte "26/09/2026" ou "2026-09-26" para 'AAAA-MM-DD'. */
function parseDateCell(v: string) {
  const s = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

/** Acrescenta movimentos a partir de um CSV. Cria as categorias que não existirem. Devolve quantos importou. */
export async function importCSV(text: string) {
  const rows = parseCSV(text.replace(/^﻿/, ''))
  if (rows.length < 2) throw new Error('O ficheiro não tem movimentos.')
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const [iData, iTipo, iCat, iValor, iNota] = ['data', 'tipo', 'categoria', 'valor', 'nota'].map(col)
  if (iData < 0 || iValor < 0) throw new Error('O CSV tem de ter pelo menos as colunas "Data" e "Valor".')

  const now = Date.now()
  const cats = await db.categories.toArray()
  const newCats: Category[] = []
  const txs: Transaction[] = []
  const errors: number[] = []

  const findCat = (name: string, type: Transaction['type']) => {
    const n = name.trim() || 'Outros'
    const all = [...cats, ...newCats]
    let c = all.find((c) => c.type === type && c.name.toLowerCase() === n.toLowerCase())
    if (!c) {
      c = { id: uid(), name: n, icon: '🏷️', color: '#64748b', type, order: all.length, updatedAt: now }
      newCats.push(c)
    }
    return c.id
  }

  rows.slice(1).forEach((r, idx) => {
    const date = parseDateCell(r[iData] ?? '')
    const raw = (r[iValor] ?? '').trim()
    const amount = parseMoney(raw.replace(/^-/, ''))
    if (!date || amount === null || amount === 0) {
      errors.push(idx + 2)
      return
    }
    const tipo = (r[iTipo] ?? '').trim().toLowerCase()
    const type: Transaction['type'] = tipo.startsWith('rec') ? 'receita' : 'despesa'
    txs.push({
      id: uid(),
      type,
      amount,
      date,
      categoryId: findCat(iCat >= 0 ? r[iCat] ?? '' : '', type),
      note: iNota >= 0 ? (r[iNota] ?? '').trim() : '',
      createdAt: now,
      updatedAt: now,
    })
  })

  await db.transaction('rw', db.categories, db.transactions, async () => {
    await db.categories.bulkAdd(newCats)
    await db.transactions.bulkAdd(txs)
  })
  return { imported: txs.length, skippedLines: errors }
}

export async function wipeAll() {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
    await db.categories.bulkAdd(defaultCategories())
  })
}
