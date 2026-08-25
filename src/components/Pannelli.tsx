import { useEffect, useRef, useState } from 'react'
import type { Scansione } from '../lib/db'
import { formatBarcode, normalizeBarcode } from '../lib/barcode'
import { quando } from '../lib/format'
import type { MotivoErrore } from '../hooks/useScanner'

/** La striscia dei prodotti già letti, che resta a portata di pollice
 *  mentre la fotocamera cerca. */
export function Recenti({ righe, onApri }: { righe: Scansione[]; onApri: (codice: string) => void }) {
  return (
    <div className="spia">
      <div className="spia-testa">
        <span className="etichetta">Letti di recente</span>
        {righe.length > 0 && <span className="etichetta">{righe.length}</span>}
      </div>
      {righe.length === 0 ? (
        <p className="vuoto">Inquadra un codice a barre. I prodotti letti restano qui, solo su questo telefono.</p>
      ) : (
        <div className="striscia">
          {righe.map((r) => (
            <button type="button" className="tessera" key={r.barcode} onClick={() => onApri(r.barcode)}>
              {r.image ? (
                <img className="tessera-foto" src={r.image} alt="" loading="lazy" />
              ) : (
                <span className="tessera-foto" aria-hidden="true" />
              )}
              <span className="tessera-nome">{r.trovato ? (r.name ?? 'Senza nome') : 'Non trovato'}</span>
              <span className="tessera-sotto">{quando(r.at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Digitare il codice a mano non è un ripiego di serie B: serve quando il
 *  codice è rovinato, quando la confezione è nel freezer dietro il vetro,
 *  e quando la fotocamera non si può usare. */
export function CodiceAMano({ onCerca, onChiudi }: { onCerca: (codice: string) => void; onChiudi: () => void }) {
  const [valore, setValore] = useState('')
  const campo = useRef<HTMLInputElement | null>(null)
  const pulito = normalizeBarcode(valore)

  useEffect(() => {
    campo.current?.focus()
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [onChiudi])

  return (
    <div className="velo" onPointerDown={(e) => e.target === e.currentTarget && onChiudi()}>
      <form
        className="finestra"
        role="dialog"
        aria-modal="true"
        aria-label="Digita il codice a barre"
        onSubmit={(e) => {
          e.preventDefault()
          if (pulito.length >= 8) onCerca(pulito)
        }}
      >
        <h2>Digita il codice</h2>
        <p>Le cifre stampate sotto le barre, senza spazi.</p>
        <input
          ref={campo}
          className="campo"
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
          placeholder="8 000500 310427"
          aria-label="Codice a barre"
        />
        <button type="submit" className="bottone bottone-pieno bottone-largo" disabled={pulito.length < 8}>
          Cerca
        </button>
        <button type="button" className="bottone-piatto" onClick={onChiudi}>
          annulla
        </button>
      </form>
    </div>
  )
}

const ERRORI: Record<MotivoErrore, { titolo: string; testo: string }> = {
  permesso: {
    titolo: 'Serve il permesso della fotocamera',
    testo: 'Il browser lo ha negato. Puoi consentirlo dalle impostazioni del sito, oppure digitare il codice a mano.',
  },
  'nessuna-fotocamera': {
    titolo: 'Nessuna fotocamera disponibile',
    testo: 'Questo dispositivo non ne espone una utilizzabile dal browser.',
  },
  'contesto-non-sicuro': {
    titolo: 'Connessione non sicura',
    testo: 'La fotocamera funziona solo su HTTPS o su localhost. Apri l’app dall’indirizzo sicuro.',
  },
  occupata: {
    titolo: 'Fotocamera occupata',
    testo: 'La sta usando un’altra applicazione. Chiudila e riprova.',
  },
  'lettura-non-avviata': {
    titolo: 'La fotocamera funziona, la lettura no',
    testo: 'Non riesco ad avviare il riconoscimento dei codici su questo browser. Il codice puoi digitarlo a mano.',
  },
  generico: {
    titolo: 'Non riesco ad avviare la fotocamera',
    testo: 'Riprova, oppure digita il codice a mano.',
  },
}

export function ErroreFotocamera({ motivo, onCodiceAMano }: { motivo: MotivoErrore; onCodiceAMano: () => void }) {
  const m = ERRORI[motivo]
  return (
    <div className="foglio-corpo">
      <div className="stato">
        <h2>{m.titolo}</h2>
        <p>{m.testo}</p>
        <button type="button" className="bottone bottone-pieno" onClick={onCodiceAMano}>
          Digita il codice
        </button>
      </div>
    </div>
  )
}

export function Cercando({ codice }: { codice: string }) {
  return (
    <div className="foglio-corpo">
      <div className="stato">
        <span className="rotella" aria-hidden="true" />
        <h2>Cerco il prodotto</h2>
        <p className="num">{formatBarcode(codice)}</p>
      </div>
    </div>
  )
}

interface EsitoVuotoProps {
  titolo: string
  testo: string
  codice?: string
  azione?: { testo: string; onClick: () => void }
}

export function EsitoVuoto({ titolo, testo, codice, azione }: EsitoVuotoProps) {
  return (
    <div className="foglio-corpo">
      <div className="stato">
        <h2>{titolo}</h2>
        <p>{testo}</p>
        {codice && <p className="num">{formatBarcode(codice)}</p>}
        {azione && (
          <button type="button" className="bottone bottone-vuoto" onClick={azione.onClick}>
            {azione.testo}
          </button>
        )}
      </div>
    </div>
  )
}
