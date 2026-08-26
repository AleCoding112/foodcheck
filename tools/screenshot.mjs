/**
 * Fotografa l'app con Chrome, pilotato dal protocollo DevTools.
 *
 * Serve perché --screenshot da riga di comando scatta prima che le chiamate
 * di rete siano finite: la scheda prodotto risultava sempre "sto cercando".
 * Qui si aspetta il caricamento e poi un margine, e si può scegliere la
 * misura dello schermo.
 *
 *   node tools/screenshot.mjs <url> <file.png> [larghezza] [altezza] [attesa_ms]
 */
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [url, uscita, larghezza = '390', altezza = '844', attesa = '2500', scorri = '0'] = process.argv.slice(2)

if (!url || !uscita) {
  console.error('uso: node tools/screenshot.mjs <url> <file.png> [larghezza] [altezza] [attesa_ms]')
  process.exit(1)
}

// Una porta diversa a ogni esecuzione: con una porta fissa, un Chrome
// rimasto appeso da una prova precedente continua a rispondere e ci si
// collega a lui — con le sue impostazioni, non con quelle richieste qui.
const porta = 9300 + (process.pid % 500)
// Con la fotocamera finta serve un profilo stabile: macOS nega l'accesso ai
// profili appena creati ("Permission denied by system") e la prova fallirebbe
// per un motivo che non ha nulla a che vedere con l'app.
const profilo =
  process.env.FINTA_FOTOCAMERA === '1'
    ? '/tmp/foodcheck-chrome-fisso'
    : await mkdtemp(join(tmpdir(), 'foodcheck-chrome-'))

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${porta}`,
  `--user-data-dir=${profilo}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  // Con FINTA_FOTOCAMERA=1 Chrome fornisce un video sintetico e concede il
  // permesso da solo: è l'unico modo per fotografare la schermata di
  // scansione senza una fotocamera vera.
  ...(process.env.FINTA_FOTOCAMERA === '1'
    ? [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ]
    : []),
  'about:blank',
], { stdio: 'ignore' })

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

async function attendiChrome() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/version`)
      if (r.ok) return (await r.json()).webSocketDebuggerUrl
    } catch { /* non è ancora in ascolto */ }
    await pausa(150)
  }
  throw new Error('Chrome non ha aperto la porta di controllo')
}

const ws = new WebSocket(await attendiChrome())
await new Promise((r) => (ws.onopen = r))

let seq = 0
const attesi = new Map()
const eventi = new Map()

ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && attesi.has(m.id)) {
    const { ok, ko } = attesi.get(m.id)
    attesi.delete(m.id)
    m.error ? ko(new Error(m.error.message)) : ok(m.result)
  } else if (m.method && eventi.has(m.method)) {
    eventi.get(m.method)()
    eventi.delete(m.method)
  }
}

function invia(method, params = {}, sessionId) {
  const id = ++seq
  return new Promise((ok, ko) => {
    attesi.set(id, { ok, ko })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
}

const evento = (nome) => new Promise((r) => eventi.set(nome, r))

try {
  const { targetId } = await invia('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await invia('Target.attachToTarget', { targetId, flatten: true })

  await invia('Emulation.setDeviceMetricsOverride', {
    width: Number(larghezza),
    height: Number(altezza),
    deviceScaleFactor: 2,
    mobile: true,
  }, sessionId)

  // Il permesso va concesso esplicitamente: senza, navigator.permissions
  // risponde "prompt" e l'app resta in attesa del tocco dell'utente.
  if (process.env.FINTA_FOTOCAMERA === '1') {
    await invia('Browser.grantPermissions', {
      origin: new URL(url).origin,
      permissions: ['videoCapture'],
    })
  }

  await invia('Page.enable', {}, sessionId)
  const caricata = evento('Page.loadEventFired')
  await invia('Page.navigate', { url }, sessionId)
  await caricata
  await pausa(Number(attesa))

  // CLIC="selettore" tocca un elemento prima di scattare: serve a fotografare
  // finestre e pannelli che si aprono solo interagendo.
  if (process.env.CLIC) {
    await invia('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(process.env.CLIC)})?.click()`,
    }, sessionId)
    await pausa(600)
  }

  // La scheda scorre dentro il foglio, non nella pagina: per vedere il resto
  // bisogna scorrere quell'elemento.
  if (Number(scorri) > 0) {
    await invia('Runtime.evaluate', {
      expression: `document.querySelector('.foglio-corpo')?.scrollTo(0, ${Number(scorri)})`,
    }, sessionId)
    await pausa(700)
  }

  // RITAGLIO="x,y,larghezza,altezza" fotografa solo una porzione: serve per
  // guardare da vicino un dettaglio senza aprire un editor di immagini.
  const ritaglio = process.env.RITAGLIO
    ? (([x, y, w, h]) => ({ x, y, width: w, height: h, scale: 2 }))(process.env.RITAGLIO.split(',').map(Number))
    : undefined

  if (process.env.DIAGNOSI === '1') {
    const leggi = async (expr) => (await invia('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result.value
    console.log('permesso:', await leggi(`navigator.permissions.query({name:'camera'}).then(p=>p.state)`))
    console.log('errore  :', await leggi(`document.querySelector('.stato h2')?.textContent ?? 'nessuno'`))
    console.log('istruz. :', await leggi(`document.querySelector('.istruzione')?.textContent ?? 'assente'`))
    console.log('video   :', await leggi(`(()=>{const v=document.querySelector('video');return JSON.stringify({src:!!v.srcObject,rs:v.readyState,w:v.videoWidth})})()`))
    console.log('gUM     :', await leggi(`navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}).then(()=>'ok').catch(e=>e.name+': '+e.message)`))
    console.log('gUM base:', await leggi(`navigator.mediaDevices.getUserMedia({video:true}).then(()=>'ok').catch(e=>e.name+': '+e.message)`))
  }

  const { data } = await invia('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: !ritaglio,
    ...(ritaglio ? { clip: ritaglio } : {}),
  }, sessionId)

  await writeFile(uscita, Buffer.from(data, 'base64'))
  console.log(`${uscita} · ${(Buffer.from(data, 'base64').length / 1024).toFixed(0)} KB`)
} finally {
  ws.close()
  chrome.kill('SIGKILL')
  // Chrome sta ancora scrivendo nel profilo mentre chiude: se la pulizia
  // fallisce non è un problema, è una cartella temporanea.
  if (process.env.FINTA_FOTOCAMERA !== '1') {
    // Chrome sta ancora scrivendo nel profilo mentre chiude: se la pulizia
    // fallisce non è un problema, è una cartella temporanea.
    await rm(profilo, { recursive: true, force: true }).catch(() => undefined)
  }
}
