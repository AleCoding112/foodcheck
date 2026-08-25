import { useCallback, useEffect, useRef, useState } from 'react'
import { Scanner } from './components/Scanner'
import { ProductView } from './components/ProductView'
import { cercaProdotto } from './lib/sources'
import { registraScansione, ultimeScansioni, type Scansione } from './lib/db'
import { formatBarcode, normalizeBarcode } from './lib/barcode'
import { quando } from './lib/format'
import type { Resolution } from './types/product'

type Vista =
  | { tipo: 'home' }
  | { tipo: 'scansione' }
  | { tipo: 'ricerca'; codice: string }
  | { tipo: 'esito'; risultato: Resolution }

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'home' })
  const [recenti, setRecenti] = useState<Scansione[]>([])
  const [manuale, setManuale] = useState('')
  const richiestaCorrente = useRef(0)

  const ricaricaRecenti = useCallback(() => {
    ultimeScansioni().then(setRecenti)
  }, [])

  useEffect(() => {
    ricaricaRecenti()
  }, [ricaricaRecenti])

  const cerca = useCallback(
    async (codiceGrezzo: string, opzioni: { forza?: boolean; registra?: boolean } = {}) => {
      const codice = normalizeBarcode(codiceGrezzo)
      if (!codice) return
      const id = ++richiestaCorrente.current
      setVista({ tipo: 'ricerca', codice })

      const risultato = await cercaProdotto(codice, { forza: opzioni.forza })
      if (id !== richiestaCorrente.current) return

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

      setVista({ tipo: 'esito', risultato })
    },
    [ricaricaRecenti],
  )

  const inviaManuale = (e: React.FormEvent) => {
    e.preventDefault()
    const codice = normalizeBarcode(manuale)
    if (codice.length < 8) return
    setManuale('')
    cerca(codice)
  }

  if (vista.tipo === 'scansione') {
    return (
      <Scanner
        onCodice={(codice) => cerca(codice)}
        onChiudi={() => setVista({ tipo: 'home' })}
      />
    )
  }

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">
          <span className="bars" aria-hidden="true" />
          FoodCheck
        </span>
        {vista.tipo !== 'home' && (
          <button type="button" className="btn btn-quiet" onClick={() => setVista({ tipo: 'home' })}>
            ← Home
          </button>
        )}
      </div>

      {vista.tipo === 'home' && (
        <>
          <section className="hero">
            <h1>Scansiona un codice a barre, sappi cosa stai per mangiare.</h1>
            <p>Ingredienti, allergeni dichiarati, valori nutrizionali e additivi. Nessun account, nessun dato che esce dal telefono.</p>
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={() => setVista({ tipo: 'scansione' })}
            >
              Inquadra un prodotto
            </button>
            <form className="manual" onSubmit={inviaManuale}>
              <input
                value={manuale}
                onChange={(e) => setManuale(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={16}
                placeholder="oppure digita il codice"
                aria-label="Codice a barre"
              />
              <button type="submit" className="btn btn-ghost" disabled={normalizeBarcode(manuale).length < 8}>
                Cerca
              </button>
            </form>
          </section>

          <h2 className="section-label">Scansioni recenti</h2>
          {recenti.length === 0 ? (
            <p className="empty">Qui compariranno i prodotti che hai letto. Restano solo su questo dispositivo.</p>
          ) : (
            <ul className="recent">
              {recenti.map((r) => (
                <li key={r.barcode}>
                  <button type="button" className="recent-item" onClick={() => cerca(r.barcode, { registra: false })}>
                    {r.image ? (
                      <img className="recent-thumb" src={r.image} alt="" loading="lazy" />
                    ) : (
                      <span className="recent-thumb" aria-hidden="true" />
                    )}
                    <span className="recent-main">
                      <span className="recent-name">{r.trovato ? (r.name ?? 'Senza nome') : 'Non trovato'}</span>
                      <span className="recent-sub">
                        {r.brand ? `${r.brand} · ` : ''}
                        {formatBarcode(r.barcode)} · {quando(r.at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {vista.tipo === 'ricerca' && (
        <div className="state">
          <span className="spinner" aria-hidden="true" />
          <h2>Cerco il prodotto</h2>
          <p className="code mono">{formatBarcode(vista.codice)}</p>
        </div>
      )}

      {vista.tipo === 'esito' && <Esito risultato={vista.risultato} onRiprova={cerca} />}
    </div>
  )
}

function Esito({
  risultato,
  onRiprova,
}: {
  risultato: Resolution
  onRiprova: (codice: string, opzioni?: { forza?: boolean; registra?: boolean }) => void
}) {
  switch (risultato.status) {
    case 'trovato':
      return (
        <ProductView
          prodotto={risultato.product}
          daCache={risultato.fromCache}
          onAggiorna={() => onRiprova(risultato.product.barcode, { forza: true, registra: false })}
        />
      )

    case 'codice-interno':
      return (
        <div className="state">
          <h2>Codice interno del punto vendita</h2>
          <p>
            Questo codice è stato stampato dal negozio — banco gastronomia, frutta a peso, etichette di
            reparto. Non esiste in nessun database mondiale, perché vale solo dentro quel supermercato.
          </p>
          <p className="code mono">{formatBarcode(risultato.barcode)}</p>
        </div>
      )

    case 'non-trovato':
      return (
        <div className="state">
          <h2>Questo prodotto non è nel database</h2>
          <p>
            Capita spesso con le marche del supermercato e i prodotti locali: il database è compilato da
            volontari e nessuno l’ha ancora inserito.
          </p>
          <p className="code mono">{formatBarcode(risultato.barcode)}</p>
          <button type="button" className="btn btn-ghost" onClick={() => onRiprova(risultato.barcode, { forza: true, registra: false })}>
            Cerca di nuovo
          </button>
        </div>
      )

    case 'offline':
      return (
        <div className="state">
          <h2>Sei senza connessione</h2>
          <p>
            I prodotti già letti restano consultabili. Per questo serve la rete: riprova quando torna il
            segnale.
          </p>
          <p className="code mono">{formatBarcode(risultato.barcode)}</p>
          <button type="button" className="btn btn-ghost" onClick={() => onRiprova(risultato.barcode, { forza: true, registra: false })}>
            Riprova
          </button>
        </div>
      )

    case 'errore':
    default:
      return (
        <div className="state">
          <h2>Non sono riuscito a controllare</h2>
          <p>{risultato.message}</p>
          <button type="button" className="btn btn-ghost" onClick={() => onRiprova(risultato.barcode, { forza: true, registra: false })}>
            Riprova
          </button>
        </div>
      )
  }
}
