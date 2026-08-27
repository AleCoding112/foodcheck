/**
 * Apre l'app in WebKit — lo stesso motore di Safari — e racconta cosa
 * succede quando si tocca "Attiva la fotocamera".
 *
 * Serve perché finora avevo provato solo in Chrome, che su fotocamera e
 * permessi si comporta in modo diverso da iPhone.
 *
 *   node tools/prova-webkit.mjs <url> [--permesso]
 */
import { webkit, devices } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:4173/'
const concediPermesso = process.argv.includes('--permesso')

const browser = await webkit.launch()
const contesto = await browser.newContext({
  ...devices['iPhone 13'],
  permissions: concediPermesso ? ['camera'] : [],
})
const pagina = await contesto.newPage()

const registro = []
pagina.on('console', (m) => registro.push(`console.${m.type()}: ${m.text()}`))
pagina.on('pageerror', (e) => registro.push(`ECCEZIONE: ${e.name}: ${e.message}`))
pagina.on('requestfailed', (r) => registro.push(`richiesta fallita: ${r.url().slice(-60)} — ${r.failure()?.errorText}`))

console.log(`WebKit · ${url}${concediPermesso ? ' · permesso concesso' : ' · nessun permesso'}`)
console.log('')

await pagina.goto(url, { waitUntil: 'load' })
// L'accertamento dei fotogrammi dura fino a 2,5 secondi: leggere prima
// significa leggere uno stato non ancora deciso.
await pagina.waitForTimeout(4500)

const leggi = () =>
  pagina.evaluate(() => {
    const t = (s) => document.querySelector(s)?.textContent?.trim() ?? null
    return {
      pulsanti: [...document.querySelectorAll('button')].map((b) => (b.textContent || b.ariaLabel || '').trim()).filter(Boolean),
      istruzione: t('.istruzione'),
      immagineFerma: t('.sblocca'),
      titoloStato: t('.stato h2'),
      testoStato: t('.stato p'),
      dettaglio: t('.dettaglio-errore'),
      mirinoDormiente: document.querySelector('.mirino')?.getAttribute('data-dormiente') ?? null,
      video: (() => {
        const v = document.querySelector('video')
        return v ? { flusso: !!v.srcObject, pronto: v.readyState, larghezza: v.videoWidth } : null
      })(),
    }
  })

console.log('PRIMA DEL TOCCO'); console.log(await leggi())

const pulsante = pagina.getByRole('button', { name: /Attiva la fotocamera/ })
const visibile = await pulsante.count()
console.log('')
console.log(`pulsante "Attiva la fotocamera" trovato: ${visibile > 0}`)

if (visibile > 0) {
  await pulsante.click()
  for (const attesa of [1000, 4000, 9000]) {
    await pagina.waitForTimeout(attesa === 1000 ? 1000 : attesa - 1000)
    console.log('')
    console.log(`DOPO ${attesa / 1000}s`)
    console.log(await leggi())
  }
}

console.log('')
console.log('REGISTRO DEL BROWSER')
console.log(registro.length ? registro.join('\n') : '  (niente)')

await browser.close()
