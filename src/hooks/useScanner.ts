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
  | 'lettura-non-avviata'
  | 'generico'

export interface Scanner {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stato: StatoScanner
  errore?: MotivoErrore
  motore?: 'nativo' | 'zxing'
  torciaDisponibile: boolean
  torciaAccesa: boolean
  commutaTorcia: () => void
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

function classificaErrore(err: unknown): MotivoErrore {
  const nome = (err as { name?: string } | null)?.name ?? ''
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
 * Due precauzioni contro le letture sbagliate, che a scaffale capitano spesso:
 * il codice deve superare la cifra di controllo e va letto due volte uguale.
 */
export function useScanner(acceso: boolean, inPausa: boolean, onCodice: (codice: string) => void): Scanner {
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

  // 1. Il flusso video: si apre quando l'app accende la fotocamera e resta.
  useEffect(() => {
    if (!acceso) return
    let annullato = false

    async function avvia() {
      setStato('avvio')
      setErrore(undefined)

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

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      } catch (err) {
        if (annullato) return
        setErrore(classificaErrore(err))
        setStato('errore')
        return
      }

      if (annullato) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true
      // Volutamente senza await: la promessa di play() in certe condizioni non
      // si risolve mai, e aspettarla lasciava l'app ferma su "accendo la
      // fotocamera" per sempre. L'immagine parte lo stesso, e il ciclo di
      // lettura controlla comunque che ci siano fotogrammi pronti.
      void video.play().catch(() => undefined)

      const track = stream.getVideoTracks()[0]
      setTorciaDisponibile(Boolean(track?.getCapabilities?.()?.torch))
      if (!annullato) setStato('attivo')
    }

    avvia()

    return () => {
      annullato = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
      setStato('spento')
      setTorciaAccesa(false)
      setTorciaDisponibile(false)
      setMotore(undefined)
    }
  }, [acceso])

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

  return { videoRef, stato, errore, motore, torciaDisponibile, torciaAccesa, commutaTorcia }
}
