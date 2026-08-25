import { useScanner, type MotivoErrore } from '../hooks/useScanner'

interface Props {
  onCodice: (codice: string) => void
  onChiudi: () => void
}

const MESSAGGI: Record<MotivoErrore, { titolo: string; testo: string }> = {
  permesso: {
    titolo: 'Serve il permesso della fotocamera',
    testo:
      'Il browser ha bloccato l’accesso. Aprilo dalle impostazioni del sito e consenti la fotocamera, oppure digita il codice a mano.',
  },
  'nessuna-fotocamera': {
    titolo: 'Nessuna fotocamera disponibile',
    testo: 'Questo dispositivo non espone una fotocamera utilizzabile dal browser.',
  },
  'contesto-non-sicuro': {
    titolo: 'Connessione non sicura',
    testo:
      'La fotocamera funziona solo su HTTPS (oppure su localhost). Apri l’app dall’indirizzo sicuro.',
  },
  occupata: {
    titolo: 'Fotocamera occupata',
    testo: 'Un’altra applicazione la sta usando. Chiudila e riprova.',
  },
  generico: {
    titolo: 'Non riesco ad avviare la fotocamera',
    testo: 'Riprova, oppure digita il codice a mano.',
  },
}

export function Scanner({ onCodice, onChiudi }: Props) {
  const s = useScanner(true, onCodice)
  const messaggio = s.errore ? MESSAGGI[s.errore] : undefined

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Lettura codice a barre">
      <video ref={s.videoRef} playsInline muted aria-hidden="true" />
      {!messaggio && (
        <>
          <div className="scanner-mask" aria-hidden="true" />
          <div className="scanner-frame" aria-hidden="true" />
        </>
      )}

      <div className="scanner-bar">
        <button type="button" className="scanner-btn" onClick={onChiudi}>
          Chiudi
        </button>
        {s.torciaDisponibile && (
          <button
            type="button"
            className="scanner-btn"
            aria-pressed={s.torciaAccesa}
            onClick={s.commutaTorcia}
          >
            Torcia
          </button>
        )}
      </div>

      {messaggio ? (
        <div className="scanner-error">
          <h2>{messaggio.titolo}</h2>
          <p>{messaggio.testo}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={onChiudi}>
            Torna indietro
          </button>
        </div>
      ) : (
        <div className="scanner-foot">
          <p className="scanner-hint">
            {s.stato === 'avvio'
              ? 'Avvio della fotocamera…'
              : 'Inquadra il codice a barre. Tienilo dritto e riempi il riquadro.'}
          </p>
        </div>
      )}
    </div>
  )
}
