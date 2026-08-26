import { useCallback, useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { codiceAttendibile } from '../lib/sources'
import { normalizeBarcode } from '../lib/barcode'

export type StatoScanner = 'spento' | 'avvio' | 'attivo' | 'errore'

export type MotivoErrore =
  | 'permesso'
  | 'nessuna-fotocamera'
  | 'contesto-non-sicuro'
  | 'occupata'
  | 'nessuna-risposta'
  | 'lettura-non-avviata'
  | 'generico'

export interface Scanner {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stato: StatoScanner
  errore?: MotivoErrore
  /** Nome tecnico dell'errore del browser: serve a capire cosa è successo
   *  quando qualcuno segnala che "non funziona". */
  dettaglioErrore?: string
  motore?: 'nativo' | 'zxing'
  torciaDisponibile: boolean
  torciaAccesa: boolean
  commutaTorcia: () => void
  /** Va chiamata direttamente dentro il gestore del tocco. */
  avvia: () => Promise<void>
}

const FORMATI_NATIVI = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'code_128']

/** ZXing pesa mezzo megabyte: si scarica solo se il browser non sa leggere i
 *  codici da solo, cioè in pratica solo su iPhone. */
async function caricaZxing() {
  const [browser, library] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
  const hints = new Map()
  hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [
    library.BarcodeFormat.EAN_13,
    library.BarcodeFormat.EAN_8,
    library.BarcodeFormat.UPC_A,
    library.BarcodeFormat.UPC_E,
    library.BarcodeFormat.ITF,
    library.BarcodeFormat.CODE_128,
  ])
  hints.set(library.DecodeHintType.TRY_HARDER, true)
  return new browser.BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
}

/** In modalità app aggiunta alla schermata home iOS a volte non risponde
 *  affatto alla richiesta della fotocamera: né permesso né rifiuto, la
 *  promessa resta sospesa per sempre. Senza un limite di tempo l'app
 *  aspetterebbe in silenzio, che è esattamente come "non fa niente". */
function conScadenza<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<never>((_, rifiuta) =>
      setTimeout(() => rifiuta(new DOMException('nessuna risposta dal browser', 'TimeoutError')), ms),
    ),
  ])
}

export function inModalitaApp(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function classificaErrore(err: unknown): MotivoErrore {
  const nome = (err as { name?: string } | null)?.name ?? ''
  if (nome === 'TimeoutError') return 'nessuna-risposta'
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'permesso'
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'nessuna-fotocamera'
  if (nome === 'NotReadableError' || nome === 'AbortError') return 'occupata'
  return 'generico'
}

/**
 * Fotocamera e decodifica, con due cicli di vita distinti.
 *
 * Il flusso video si apre una volta sola e resta aperto: riaprirlo a ogni
 * scansione costa un secondo buono e fa lampeggiare lo schermo. La decodifica
 * invece si ferma appena un prodotto viene trovato — mentre leggi la scheda
 * non ha senso continuare a macinare fotogrammi, e la batteria ringrazia.
 *
 * `avvia` non parte da sola dentro un effetto: Safari concede la fotocamera
 * solo se la richiesta parte dal gesto dell'utente, e in un'app aggiunta alla
 * schermata home è ancora più rigido. Chiamarla dentro useEffect significa
 * chiamarla dopo il tocco, quando l'autorizzazione del gesto è già scaduta:
 * il permesso viene negato senza nemmeno mostrare la richiesta.
 *
 * Due precauzioni contro le letture sbagliate, che a scaffale capitano spesso:
 * il codice deve superare la cifra di controllo e va letto due volte uguale.
 */
export function useScanner(inPausa: boolean, onCodice: (codice: string) => void): Scanner {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const ultimaLettura = useRef<{ codice: string; quando: number } | null>(null)
  const consegnato = useRef(false)
  const onCodiceRef = useRef(onCodice)
  onCodiceRef.current = onCodice

  const [stato, setStato] = useState<StatoScanner>('spento')
  const [errore, setErrore] = useState<MotivoErrore | undefined>()
  const [motore, setMotore] = useState<'nativo' | 'zxing' | undefined>()
  const [torciaDisponibile, setTorciaDisponibile] = useState(false)
  const [torciaAccesa, setTorciaAccesa] = useState(false)
  const [dettaglio, setDettaglio] = useState<string | undefined>()

  const proponi = useCallback((grezzo: string) => {
    if (consegnato.current) return
    const codice = normalizeBarcode(grezzo)
    if (!codice || !codiceAttendibile(codice)) return

    const ora = Date.now()
    const precedente = ultimaLettura.current
    if (precedente && precedente.codice === codice && ora - precedente.quando < 2500) {
      consegnato.current = true
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(35)
      onCodiceRef.current(codice)
      return
    }
    ultimaLettura.current = { codice, quando: ora }
  }, [])

  const commutaTorcia = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const nuovo = !torciaAccesa
    track
      .applyConstraints({ advanced: [{ torch: nuovo }] })
      .then(() => setTorciaAccesa(nuovo))
      .catch(() => setTorciaDisponibile(false))
  }, [torciaAccesa])

  const avvia = useCallback(async () => {
    try {
      await avviaDavvero()
    } catch (err) {
      // Nessun percorso deve finire in silenzio: un'app che non dice niente
      // è indistinguibile da un'app rotta.
      const e = err as { name?: string; message?: string } | null
      setErrore('generico')
      setDettaglio(`${e?.name ?? 'Errore'}: ${e?.message ?? 'imprevisto'}`)
      setStato('errore')
    }
  }, [])

  const avviaDavvero = useCallback(async () => {
    if (streamRef.current) return
    setStato('avvio')
    setErrore(undefined)
    setDettaglio(undefined)

    // La fotocamera richiede una connessione sicura: localhost va bene,
    // un indirizzo di rete locale in chiaro no.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setErrore('contesto-non-sicuro')
      setStato('errore')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrore('nessuna-fotocamera')
      setStato('errore')
      return
    }

    // Si scende di pretese a ogni tentativo. Alcuni iPhone rifiutano una
    // richiesta troppo specifica e accettano quella nuda.
    const tentativi: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      { video: true, audio: false },
    ]

    let stream: MediaStream | undefined
    let ultimoErrore: unknown
    for (const vincoli of tentativi) {
      try {
        const richiesta = navigator.mediaDevices.getUserMedia(vincoli)
        // Se la richiesta scade ma poi risponde lo stesso, il flusso va chiuso:
        // altrimenti resta la spia della fotocamera accesa a vuoto.
        richiesta.then((tardiva) => {
          if (streamRef.current !== tardiva && tardiva !== stream) {
            tardiva.getTracks().forEach((t) => t.stop())
          }
        }).catch(() => undefined)
        stream = await conScadenza(richiesta, 12000)
        break
      } catch (err) {
        ultimoErrore = err
        const nome = (err as { name?: string } | null)?.name
        // Se il permesso è negato o non arriva risposta, insistere con vincoli
        // più larghi non cambia nulla.
        if (nome === 'NotAllowedError' || nome === 'SecurityError' || nome === 'TimeoutError') break
      }
    }

    if (!stream) {
      const err = ultimoErrore as { name?: string; message?: string } | null
      setErrore(classificaErrore(ultimoErrore))
      setDettaglio(`${err?.name ?? 'Errore'}: ${err?.message ?? 'motivo non riportato dal browser'}`)
      setStato('errore')
      return
    }

    streamRef.current = stream
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true
      // Volutamente senza await: la promessa di play() in certe condizioni non
      // si risolve mai, e aspettarla lasciava l'app ferma su "accendo la
      // fotocamera" per sempre.
      void video.play().catch(() => undefined)
    }

    setTorciaDisponibile(Boolean(stream.getVideoTracks()[0]?.getCapabilities?.()?.torch))
    setStato('attivo')
  }, [])

  // Lo spegnimento avviene solo quando la pagina viene chiusa: tenere il
  // flusso aperto evita il secondo di nero a ogni scansione.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // 2. L'immagine si congela mentre leggi la scheda, e riparte quando chiudi.
  useEffect(() => {
    const video = videoRef.current
    if (!video || stato !== 'attivo') return
    if (inPausa) video.pause()
    else void video.play().catch(() => undefined)
  }, [inPausa, stato])

  // 3. La decodifica: parte solo mentre si sta davvero cercando un codice.
  useEffect(() => {
    if (stato !== 'attivo' || inPausa) return
    let annullato = false
    let attesa: number | null = null
    let controls: IScannerControls | null = null
    consegnato.current = false
    ultimaLettura.current = null

    async function decodifica() {
      const nativo = typeof window !== 'undefined' && 'BarcodeDetector' in window
      if (nativo) {
        try {
          const supportati = await BarcodeDetector.getSupportedFormats()
          const formats = FORMATI_NATIVI.filter((f) => supportati.includes(f))
          if (formats.length === 0) throw new Error('nessun formato utile')
          const detector = new BarcodeDetector({ formats })
          if (annullato) return
          setMotore('nativo')

          const passo = async () => {
            if (annullato || consegnato.current) return
            const v = videoRef.current
            if (v && v.readyState >= 2) {
              try {
                const trovati = await detector.detect(v)
                for (const t of trovati) proponi(t.rawValue)
              } catch {
                /* un fotogramma illeggibile non è un problema: si riprova */
              }
            }
            attesa = window.setTimeout(passo, 140)
          }
          passo()
          return
        } catch {
          /* si prosegue col decodificatore in JavaScript */
        }
      }

      try {
        const reader = await caricaZxing()
        const video = videoRef.current
        if (annullato || !video) return
        setMotore('zxing')
        controls = await reader.decodeFromVideoElement(video, (risultato) => {
          if (risultato) proponi(risultato.getText())
        })
        if (annullato) controls.stop()
      } catch {
        if (annullato) return
        // Qui l'errore riguarda il decodificatore, non il permesso: la
        // fotocamera sta già funzionando. Attribuirlo al permesso, come
        // succedeva prima, manda l'utente a cercare un'impostazione che è
        // già a posto.
        setErrore('lettura-non-avviata')
        setStato('errore')
      }
    }

    decodifica()

    return () => {
      annullato = true
      if (attesa !== null) clearTimeout(attesa)
      controls?.stop()
    }
  }, [stato, inPausa, proponi])

  return { videoRef, stato, errore, dettaglioErrore: dettaglio, motore, torciaDisponibile, torciaAccesa, commutaTorcia, avvia }
}
