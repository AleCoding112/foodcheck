import { useCallback, useEffect, useRef, useState } from 'react'
import { useScanner } from './hooks/useScanner'
import { Foglio } from './components/Foglio'
import { SchedaProdotto } from './components/SchedaProdotto'
import { Cercando, CodiceAMano, ErroreFotocamera, EsitoVuoto, Recenti } from './components/Pannelli'
import { cercaProdotto } from './lib/sources'
import { registraScansione, ultimeScansioni, type Scansione } from './lib/db'
import { normalizeBarcode } from './lib/barcode'
import type { Resolution } from './types/product'

type Fase =
  | { tipo: 'scansione' }
  | { tipo: 'ricerca'; codice: string }
  | { tipo: 'esito'; risultato: Resolution }

export default function App() {
  const [fase, setFase] = useState<Fase>({ tipo: 'scansione' })
  const [recenti, setRecenti] = useState<Scansione[]>([])
  const [fotocameraAccesa, setFotocameraAccesa] = useState(false)
  const [finestraCodice, setFinestraCodice] = useState(false)
  const richiestaCorrente = useRef(0)

  // Le letture da IndexedDB e dalla rete finiscono dopo qualche decimo di
  // secondo: se nel frattempo il componente è stato smontato, aggiornare lo
  // stato è un errore. Il valore va rimesso a true dentro l'effetto, perché
  // in StrictMode React monta, smonta e rimonta.
  const montato = useRef(true)
  useEffect(() => {
    montato.current = true
    return () => {
      montato.current = false
    }
  }, [])

  const ricaricaRecenti = useCallback(() => {
    ultimeScansioni().then((righe) => {
      if (montato.current) setRecenti(righe)
    })
  }, [])

  useEffect(() => {
    ricaricaRecenti()
  }, [ricaricaRecenti])

  // Un indirizzo del tipo ?p=8000500310427 apre direttamente quel prodotto:
  // serve a condividere un link, a metterlo fra i preferiti, e a riaprire
  // l'app dove si era rimasti.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const richiesto = new URLSearchParams(window.location.search).get('p')
    if (richiesto && normalizeBarcode(richiesto).length >= 8) {
      cercaRef.current(richiesto, { registra: false })
    }
    // Volutamente una volta sola, al primo caricamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Se il permesso è già stato dato la fotocamera parte da sola: aprire l'app
  // e trovarsi già in scansione è metà del suo valore. Dove `permissions` non
  // esiste — Safari, cioè proprio iPhone — resta il tocco sul pulsante, che è
  // comunque l'unico modo perché Safari conceda la fotocamera.
  useEffect(() => {
    let annullato = false
    navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((p) => {
        if (!annullato && p.state === 'granted') {
          setFotocameraAccesa(true)
          void avviaRef.current()
        }
      })
      .catch(() => undefined)
    return () => {
      annullato = true
    }
  }, [])

  const cerca = useCallback(
    async (codiceGrezzo: string, opzioni: { forza?: boolean; registra?: boolean } = {}) => {
      const codice = normalizeBarcode(codiceGrezzo)
      if (!codice) return
      const id = ++richiestaCorrente.current
      setFinestraCodice(false)
      setFase({ tipo: 'ricerca', codice })

      const risultato = await cercaProdotto(codice, { forza: opzioni.forza })
      if (id !== richiestaCorrente.current || !montato.current) return

      if (opzioni.registra !== false) {
        const p = risultato.status === 'trovato' ? risultato.product : undefined
        await registraScansione({
          barcode: p?.barcode ?? codice,
          at: Date.now(),
          name: p?.name,
          brand: p?.brands[0],
          image: p?.imageUrl,
          trovato: risultato.status === 'trovato',
        })
        ricaricaRecenti()
      }

      if (!montato.current) return
      setFase({ tipo: 'esito', risultato })
    },
    [ricaricaRecenti],
  )

  // L'effetto del link diretto parte prima che `cerca` sia definita:
  // questo riferimento tiene sempre l'ultima versione.
  const cercaRef = useRef(cerca)
  cercaRef.current = cerca

  const tornaAScansione = useCallback(() => {
    richiestaCorrente.current++
    setFase({ tipo: 'scansione' })
  }, [])

  // Mentre si legge una scheda la decodifica si ferma e l'immagine si congela:
  // continuare a macinare fotogrammi sotto un foglio coperto è solo batteria
  // buttata.
  const inPausa = fase.tipo !== 'scansione' || finestraCodice
  const scanner = useScanner(inPausa, cerca)

  const avviaRef = useRef(scanner.avvia)
  avviaRef.current = scanner.avvia

  // La richiesta della fotocamera parte da qui, dentro il tocco. Spostarla in
  // un effetto la farebbe scattare dopo, quando Safari non la considera più
  // conseguenza di un gesto e la rifiuta.
  const accendiFotocamera = async () => {
    setFotocameraAccesa(true)
    await scanner.avvia()
  }

  const cercando = fase.tipo === 'scansione' && fotocameraAccesa && !scanner.errore

  return (
    <main className="palco" data-congelato={inPausa}>
      <video ref={scanner.videoRef} playsInline muted aria-hidden="true" />
      <div className="palco-velo" aria-hidden="true" />

      {!scanner.errore && fase.tipo === 'scansione' && (
        <div className="mirino" data-dormiente={!fotocameraAccesa} aria-hidden="true">
          <i /><i /><i /><i />
          <b />
        </div>
      )}

      <div className="barra">
        <span className="marchio">
          <span aria-hidden="true" />
          FoodCheck
        </span>
        <div className="gruppo-tondi">
          {scanner.torciaDisponibile && (
            <button
              type="button"
              className="tondo"
              aria-pressed={scanner.torciaAccesa}
              aria-label="Torcia"
              onClick={scanner.commutaTorcia}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="tondo num"
            aria-label="Digita il codice a mano"
            onClick={() => setFinestraCodice(true)}
          >
            123
          </button>
        </div>
      </div>

      {!fotocameraAccesa && !scanner.errore && fase.tipo === 'scansione' && (
        <div className="avvio">
          <h1>Sappi cosa stai per mangiare</h1>
          <p>Nessun account. Niente esce da questo telefono.</p>
          <button type="button" className="bottone bottone-pieno" onClick={accendiFotocamera}>
            Attiva la fotocamera
          </button>
          <button type="button" className="bottone-piatto" onClick={() => setFinestraCodice(true)}>
            preferisco digitare il codice
          </button>
        </div>
      )}

      {cercando && (
        <p className="istruzione">
          {scanner.stato === 'avvio' ? 'Accendo la fotocamera…' : 'Riempi il riquadro con il codice a barre'}
        </p>
      )}

      {scanner.errore ? (
        <Foglio stato="aperto">
          <ErroreFotocamera
            motivo={scanner.errore}
            dettaglio={scanner.dettaglioErrore}
            onRiprova={accendiFotocamera}
            onCodiceAMano={() => setFinestraCodice(true)}
          />
        </Foglio>
      ) : fase.tipo === 'scansione' ? (
        // Al primo avvio, senza nulla da mostrare, il foglio resta chiuso:
        // un riquadro vuoto sotto l'invito ad accendere la fotocamera sarebbe
        // solo rumore.
        recenti.length === 0 && !fotocameraAccesa ? null : (
          <Foglio stato="spia">
            <Recenti righe={recenti} onApri={(codice) => cerca(codice, { registra: false })} />
          </Foglio>
        )
      ) : (
        <Foglio stato="aperto" onChiudi={tornaAScansione}>
          {fase.tipo === 'ricerca' ? (
            <Cercando codice={fase.codice} />
          ) : (
            <Esito risultato={fase.risultato} onCerca={cerca} onChiudi={tornaAScansione} />
          )}
        </Foglio>
      )}

      {finestraCodice && (
        <CodiceAMano onCerca={(codice) => cerca(codice)} onChiudi={() => setFinestraCodice(false)} />
      )}
    </main>
  )
}

function Esito({
  risultato,
  onCerca,
  onChiudi,
}: {
  risultato: Resolution
  onCerca: (codice: string, opzioni?: { forza?: boolean; registra?: boolean }) => void
  onChiudi: () => void
}) {
  const riprova = (codice: string) => ({
    testo: 'Cerca di nuovo',
    onClick: () => onCerca(codice, { forza: true, registra: false }),
  })

  switch (risultato.status) {
    case 'trovato':
      return (
        <SchedaProdotto
          prodotto={risultato.product}
          daCache={risultato.fromCache}
          onAggiorna={() => onCerca(risultato.product.barcode, { forza: true, registra: false })}
        />
      )

    case 'codice-interno':
      return (
        <EsitoVuoto
          titolo="Codice interno del punto vendita"
          testo="L’ha stampato il negozio: banco gastronomia, frutta a peso, etichette di reparto. Fuori da quel supermercato non esiste."
          codice={risultato.barcode}
          azione={{ testo: 'Chiudi', onClick: onChiudi }}
        />
      )

    case 'non-trovato':
      return (
        <EsitoVuoto
          titolo="Non è nel database"
          testo="Capita con le marche del supermercato e i prodotti locali: l’archivio è compilato da volontari e nessuno l’ha ancora inserito."
          codice={risultato.barcode}
          azione={riprova(risultato.barcode)}
        />
      )

    case 'offline':
      return (
        <EsitoVuoto
          titolo="Sei senza connessione"
          testo="I prodotti già letti restano consultabili. Per questo serve la rete."
          codice={risultato.barcode}
          azione={riprova(risultato.barcode)}
        />
      )

    default:
      return (
        <EsitoVuoto
          titolo="Non sono riuscito a controllare"
          testo={risultato.message}
          codice={risultato.barcode}
          azione={riprova(risultato.barcode)}
        />
      )
  }
}
