import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Su GitHub Pages il sito vive sotto /<nome-repo>/, in locale sotto /.
// Il workflow di deploy imposta BASE_PATH; altrove resta la radice.
const base = process.env.BASE_PATH ?? '/'

// Marcatore della versione: sul telefono, davanti a un'app che "non
// funziona", la prima cosa da sapere è se sta girando la build nuova o una
// vecchia rimasta in cache.
const versione = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  base,
  define: {
    __VERSIONE__: JSON.stringify(versione),
  },
  plugins: [
    react(),
    // La fotocamera funziona solo in contesto sicuro. In locale basta
    // localhost, ma per provare dal telefono sulla rete di casa serve HTTPS:
    // `npm run dev:https` accende un certificato autofirmato.
    ...(process.env.HTTPS === '1' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'FoodCheck',
        short_name: 'FoodCheck',
        description: 'Scansiona un codice a barre, sappi cosa stai per mangiare.',
        lang: 'it',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E0E14',
        theme_color: '#0E0E14',
        categories: ['food', 'health', 'shopping'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // ZXing serve solo ai browser senza decodificatore di sistema (in pratica
        // iPhone). Tenerlo fuori dal precaricamento evita di far scaricare mezzo
        // megabyte a chi non lo usera' mai; chi ne ha bisogno lo prende alla prima
        // scansione e da quel momento ce l'ha in cache anche offline.
        globIgnores: ['**/zxing-*.js'],
        // Le foto dei prodotti stanno su un dominio esterno: cache a parte,
        // con un tetto, cosi' non gonfiano lo spazio occupato dall'app.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/zxing-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'zxing',
              expiration: { maxEntries: 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'off-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Le risposte dell'API NON passano dal service worker:
        // la cache dei prodotti la gestiamo noi in IndexedDB (vedi src/lib/db.ts),
        // cosi' sappiamo sempre quanto e' vecchio un dato e possiamo dirlo a schermo.
        // La pagina di diagnosi deve restare quella vera, non essere
        // sostituita dall'applicazione come tutte le altre navigazioni.
        navigateFallbackDenylist: [/^\/api\//, /diagnostica\.html$/],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Un nome stabile per il pezzo di ZXing, cosi' il service worker
        // puo' riconoscerlo ed escluderlo dal precaricamento.
        manualChunks(id) {
          if (id.includes('@zxing')) return 'zxing'
          return undefined
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: { port: 5173 },
  test: {
    globals: true,
    // La logica pura gira in node; le prove sull'interfaccia dichiarano
    // jsdom con un commento in testa al file.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
