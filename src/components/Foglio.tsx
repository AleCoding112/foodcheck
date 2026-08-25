import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  stato: 'spia' | 'aperto'
  /** Assente quando il foglio non è chiudibile (la striscia dei recenti). */
  onChiudi?: () => void
  children: ReactNode
}

const SOGLIA_CHIUSURA = 96

/** Il foglio che sale sopra la fotocamera.
 *  Si chiude trascinandolo in basso, con Esc, o dal pulsante: tre strade per
 *  la stessa cosa, perché il gesto da solo non basta a chi naviga da tastiera. */
export function Foglio({ stato, onChiudi, children }: Props) {
  const foglioRef = useRef<HTMLDivElement | null>(null)
  const partenza = useRef<number | null>(null)
  const [scostamento, setScostamento] = useState(0)
  const [trascinamento, setTrascinamento] = useState(false)

  useEffect(() => {
    if (!onChiudi) return
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [onChiudi])

  // Un cambio di contenuto azzera lo scostamento: senza questo, il foglio
  // successivo comparirebbe già spostato in basso.
  useEffect(() => {
    setScostamento(0)
    setTrascinamento(false)
    partenza.current = null
  }, [stato])

  const giu = (e: React.PointerEvent) => {
    if (!onChiudi) return
    partenza.current = e.clientY
    setTrascinamento(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const muovi = (e: React.PointerEvent) => {
    if (partenza.current === null) return
    setScostamento(Math.max(0, e.clientY - partenza.current))
  }

  const su = () => {
    if (partenza.current === null) return
    partenza.current = null
    setTrascinamento(false)
    if (scostamento > SOGLIA_CHIUSURA) onChiudi?.()
    setScostamento(0)
  }

  return (
    <section
      ref={foglioRef}
      className="foglio"
      data-stato={stato}
      data-trascinamento={trascinamento}
      style={scostamento ? { transform: `translateY(${scostamento}px)` } : undefined}
      role={onChiudi ? 'dialog' : undefined}
      aria-modal={onChiudi ? true : undefined}
      aria-label={onChiudi ? 'Scheda del prodotto' : undefined}
    >
      <div
        className="maniglia"
        onPointerDown={giu}
        onPointerMove={muovi}
        onPointerUp={su}
        onPointerCancel={su}
        aria-hidden="true"
      />
      {onChiudi && (
        <button type="button" className="foglio-chiudi" onClick={onChiudi} aria-label="Chiudi e torna a scansionare">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      {children}
    </section>
  )
}
