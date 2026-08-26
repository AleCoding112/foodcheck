import { useEffect, useRef, useState } from 'react'
import type { Scansione } from '../lib/db'
import { formatBarcode, normalizeBarcode } from '../lib/barcode'
import { quando } from '../lib/format'
import { inModalitaApp, type MotivoErrore } from '../hooks/useScanner'

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
        <p className="num dettaglio-errore" style={{ textAlign: 'center', margin: 0 }}>
          versione {__VERSIONE__}
          {inModalitaApp() ? ' · da icona' : ' · da browser'}
          <br />
          <a href={`${import.meta.env.BASE_URL}diagnostica.html`}>diagnosi fotocamera</a>
        </p>
      </form>
    </div>
  )
}

const ERRORI: Record<MotivoErrore, { titolo: string; testo: string }> = {
  permesso: {
    titolo: 'Serve il permesso della fotocamera',
    testo:
      'Il browser lo ha negato. Su iPhone: Impostazioni → Safari → Fotocamera → Consenti, poi riapri l’app. Oppure digita il codice a mano.',
  },
  'nessuna-fotocamera': {
    titolo: 'Nessuna fotocamera disponibile',
    testo: 'Questo dispositivo non ne espone una utilizzabile dal browser.',
  },
  'contesto-non-sicuro': {
    titolo: 'Connessione non sicura',
    testo: 'La fotocamera funziona solo su HTTPS o su localhost. Apri l’app dall’indirizzo sicuro.',
  },
  'nessuna-risposta': {
    titolo: 'La fotocamera non risponde',
    testo:
      'Ho chiesto l’accesso e non è arrivata nessuna risposta, né sì né no. Succede su iPhone quando l’app è stata aggiunta alla schermata home: prova ad aprirla da Safari, dall’indirizzo, invece che dall’icona.',
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

interface ErroreProps {
  motivo: MotivoErrore
  dettaglio?: string
  onRiprova: () => void
  onCodiceAMano: () => void
}

export function ErroreFotocamera({ motivo, dettaglio, onRiprova, onCodiceAMano }: ErroreProps) {
  const m = ERRORI[motivo]
  const daIcona = inModalitaApp()
  return (
    <div className="foglio-corpo">
      <div className="stato">
        <h2>{m.titolo}</h2>
        <p>{m.testo}</p>
        {daIcona && motivo !== 'nessuna-risposta' && (
          <p>
            Stai usando l’app aggiunta alla schermata home. Se qui non funziona, aprila da Safari
            all’indirizzo <b>alecoding112.github.io/foodcheck</b>: iOS tratta i due casi in modo diverso.
          </p>
        )}
        <button type="button" className="bottone bottone-pieno" onClick={onRiprova}>
          Riprova
        </button>
        <button type="button" className="bottone bottone-vuoto" onClick={onCodiceAMano}>
          Digita il codice
        </button>
        {/* Il motivo tecnico, in piccolo: a chi sta usando l'app non serve,
            a chi deve capire perché non parte serve moltissimo. */}
        <p className="num dettaglio-errore">
          {dettaglio && (
            <>
              {dettaglio}
              <br />
            </>
          )}
          versione {__VERSIONE__}
          {daIcona ? ' · da icona' : ' · da browser'}
          <br />
          <a href={`${import.meta.env.BASE_URL}diagnostica.html`}>diagnosi fotocamera</a>
        </p>
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
