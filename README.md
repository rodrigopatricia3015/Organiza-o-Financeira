# Finanças: organização financeira pessoal

App simples para controlar despesas, receitas, orçamentos e objetivos de poupança. Funciona no iPhone (instalada a partir do Safari, sem App Store) e no browser do computador. Funciona offline.

## O que faz

- **Painel:** saldo do mês, despesas por categoria, evolução dos últimos 6 meses, alertas de orçamento e objetivos.
- **Movimentos:** registo de despesas e receitas (valor, data, categoria, nota), com pesquisa e filtros.
- **Orçamentos:** limite mensal por categoria, com alerta aos 80% e aos 100%.
- **Objetivos:** metas de poupança (revisão do carro, telemóvel novo, viagem…), com progresso e quanto juntar por mês.
- **Recorrentes:** renda, subscrições, salário… lançados automaticamente na data certa.
- **Categorias:** nome, ícone e cor editáveis.
- **Definições:** tema claro/escuro, cópia de segurança (JSON), exportar/importar movimentos (CSV para Excel).

## Onde ficam os dados

Os dados ficam guardados **só no dispositivo** (IndexedDB do browser). Não há servidor nem conta. Isto significa que:

- O iPhone e o computador têm dados separados. Para passar de um para o outro: *Definições → Exportar cópia* num lado e *Restaurar cópia* no outro.
- Se apagares a app do ecrã principal ou limpares os dados do Safari, os dados desaparecem. **Faz uma cópia de segurança regularmente** e guarda-a no iCloud Drive.

## Instalar

### iPhone / iPad

1. Abre o endereço da app no **Safari** (tem de ser o Safari).
2. Toca em **Partilhar** (quadrado com seta para cima).
3. Toca em **Adicionar ao ecrã principal** e depois em **Adicionar**.

A app fica com ícone próprio e abre em ecrã inteiro, como uma app normal.

### Computador

Abre o endereço no Chrome ou no Edge e clica no ícone **Instalar** que aparece à direita na barra de endereço. Noutros browsers (Safari, Firefox) basta usar no separador e guardar nos favoritos.

## Publicar online (GitHub Pages)

A publicação é automática: sempre que há alterações no ramo `main`, o GitHub Actions compila a app e publica-a em
`https://<utilizador>.github.io/<nome-do-repositório>/`.

Configuração, feita uma única vez:

1. No repositório, vai a **Settings → Pages** (as definições do repositório, não as da conta).
2. Em **Build and deployment → Source**, escolhe **GitHub Actions**.

Nota: no plano grátis do GitHub, o Pages só está disponível para repositórios **públicos**. Como os dados ficam no dispositivo de cada pessoa, tornar o repositório público expõe apenas o código, nunca os teus movimentos.

## Desenvolvimento

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev        # servidor local em http://localhost:5173
npm run build      # compila para a pasta dist/
npm run preview    # serve a versão compilada
npm run icons      # volta a gerar ícones e splash screens a partir de public/favicon.svg
```

Tecnologias: Vite, React, TypeScript, Tailwind CSS, Dexie (IndexedDB), Recharts, vite-plugin-pwa.

### Estrutura

```
src/
  db.ts              base de dados (tabelas e categorias iniciais)
  lib/               formatação pt-PT, recorrentes, orçamentos, objetivos, backup, tema
  components/        layout, navegação, formulário de movimentos, componentes comuns
  pages/             Painel, Movimentos, Orçamentos, Objetivos, Recorrentes, Categorias, Definições
public/              ícones e splash screens do iOS
```

Os valores são guardados em cêntimos (números inteiros) e os registos usam IDs UUID com data de atualização, para facilitar uma futura sincronização entre dispositivos.
