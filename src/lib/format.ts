// Formatação de valores e datas em português de Portugal.

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const eurShort = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const pct = new Intl.NumberFormat('pt-PT', { style: 'percent', maximumFractionDigits: 0 })

export const formatMoney = (cents: number) => eur.format(cents / 100)
export const formatMoneyShort = (cents: number) => eurShort.format(cents / 100)
export const formatPercent = (ratio: number) => pct.format(ratio)

/** Converte o texto escrito pelo utilizador ("12,50", "1.234,5", "12.5") em cêntimos. */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/\s|€/g, '')
  if (!s) return null
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.500" ou "1.250.000": em Portugal o ponto separa os milhares
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Cêntimos para o texto usado dentro de um campo de edição ("12,50"). */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

// ---- Datas (sempre 'AAAA-MM-DD' ou 'AAAA-MM', em hora local) ----

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => toISODate(new Date())
export const monthOf = (iso: string) => iso.slice(0, 7)
export const currentMonth = () => monthOf(todayISO())

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d || 1)
}

export function addMonthsToMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dayLongFmt = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
const monthLongFmt = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' })
const monthShortFmt = new Intl.DateTimeFormat('pt-PT', { month: 'short' })

export const formatDate = (iso: string) => dateFmt.format(parseISODate(iso))
export const formatDayLong = (iso: string) => capitalize(dayLongFmt.format(parseISODate(iso)))
export const formatMonthLong = (month: string) => capitalize(monthLongFmt.format(parseISODate(month)))
export const formatMonthShort = (month: string) =>
  capitalize(monthShortFmt.format(parseISODate(month)).replace('.', ''))

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Número de meses (arredondado para cima, mínimo 1) entre hoje e uma data. */
export function monthsUntil(iso: string) {
  const now = new Date()
  const end = parseISODate(iso)
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  return Math.max(1, months + (end.getDate() >= now.getDate() ? 1 : 0))
}
