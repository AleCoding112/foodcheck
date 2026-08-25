import { useCallback, useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { codiceAttendibile } from '../lib/sources'
import { normalizeBarcode } from '../lib/barcode'

export type StatoScanner = 'spento' | 'avvio' | 'attivo' | 'errore'

export type MotivoErrore = 'permesso' | 'nessuna-fotocamera' | 'contesto-non-sicuro' | 'occupata' | 'generico'

export interface Scanner {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stato: StatoScanner
  errore?: MotivoErrore
  /** Quale decodificatore sta lavorando: utile in fase di collaudo. */
  motore?: 'nativo' | 'zxing'
  torciaDisponibile: boolean
  torciaAccesa: boolean
  commutaTorcia: () => void
}

const FORMATI_NATIVI = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'code_128']

/** ZXing pesa mezzo megabyte: si scarica solo se il browser non sa leggere
 *  i codici da solo, cioe' in pratica solo su iPhone. Su Android l'utente
 *  non paga quel peso. */
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
 * Gestisce fotocamera e decodifica.
 *
 * Due precauzioni contro le letture sbagliate, che a scaffale capitano spesso:
 * il codice deve superare la cifra di controllo, e deve essere letto due volte
 * di fila uguale prima di essere accettato. Costa qualche decimo di secondo e
 * evita di aprire la scheda del prodotto sbagliato.
 */
export function useScanner(attivo: boolean, onCodice: (codice: string) => void): Scanner {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const loopRef = useRef<number | null>(null)
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

  useEffect(() => {
    if (!attivo) return

    let annullato = false
    consegnato.current = false
    ultimaLettura.current = null

    async function avvia() {
      setStato('avvio')
      setErrore(undefined)

      // La fotocamera richiede una connessione sicura. In locale 127.0.0.1 vale
      // come sicura; da telefono su rete di casa serve HTTPS.
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
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
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
      try {
        await video.play()
      } catch {
        /* alcuni browser rifiutano il play automatico: la ripresa parte comunque */
      }

      const track = stream.getVideoTracks()[0]
      const capacita = track?.getCapabilities?.()
      setTorciaDisponibile(Boolean(capacita?.torch))

      if (annullato) return
      setStato('attivo')

      const nativo = typeof window !== 'undefined' && 'BarcodeDetector' in window
      if (nativo) {
        try {
          const supportati = await BarcodeDetector.getSupportedFormats()
          const formats = FORMATI_NATIVI.filter((f) => supportati.includes(f))
          if (formats.length === 0) throw new Error('nessun formato utile')
          const detector = new BarcodeDetector({ formats })
          setMotore('nativo')

          const passo = async () => {
            if (annullato || consegnato.current) return
            const v = videoRef.current
            if (v && v.readyState >= 2) {
              try {
                const trovati = await detector.detect(v)
                for (const t of trovati) proponi(t.rawValue)
              } catch {
                /* un fotogramma illeggibile non e' un problema: si riprova */
              }
            }
            loopRef.current = window.setTimeout(passo, 140)
          }
          passo()
          return
        } catch {
          /* si prosegue col decodificatore in JavaScript */
        }
      }

      // Ripiego universale, usato in pratica su iPhone.
      try {
        const reader = await caricaZxing()
        if (annullato) return
        setMotore('zxing')
        controlsRef.current = await reader.decodeFromVideoElement(video, (risultato) => {
          if (risultato) proponi(risultato.getText())
        })
      } catch (err) {
        if (annullato) return
        setErrore(classificaErrore(err))
        setStato('errore')
      }
    }

    avvia()

    return () => {
      annullato = true
      if (loopRef.current !== null) {
        clearTimeout(loopRef.current)
        loopRef.current = null
      }
      controlsRef.current?.stop()
      controlsRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
      setStato('spento')
      setTorciaAccesa(false)
      setTorciaDisponibile(false)
      setMotore(undefined)
    }
  }, [attivo, proponi])

  return { videoRef, stato, errore, motore, torciaDisponibile, torciaAccesa, commutaTorcia }
}
