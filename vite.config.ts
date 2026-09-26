import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// No GitHub Pages a app fica em /<nome-do-repositório>/. O workflow define BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // A app inteira (com os gráficos) fica em cache para funcionar offline, por isso um ficheiro maior não é problema.
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'splash/*.png', 'favicon.svg'],
      manifest: {
        name: 'Organização Financeira',
        short_name: 'Finanças',
        description: 'Controlo simples de despesas, receitas, orçamentos e objetivos.',
        lang: 'pt-PT',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
