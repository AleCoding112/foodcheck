import type { Product } from '../types/product'
import { hasIngredients, hasNutrition } from '../types/product'
import { formatBarcode, gs1Origin } from '../lib/barcode'
import { descriviAdditivo } from '../lib/dictionaries/additivi'
import { ANALISI, novaInfo, nutriScoreInfo, traduciAllergene, traduciEtichetta } from '../lib/dictionaries/tags'
import { energia, numero, quando } from '../lib/format'

interface Props {
  prodotto: Product
  daCache: boolean
  onAggiorna: () => void
}

const NOMI_FONTE: Record<string, string> = {
  openfoodfacts: 'Open Food Facts',
  openbeautyfacts: 'Open Beauty Facts',
  openpetfoodfacts: 'Open Pet Food Facts',
  openproductsfacts: 'Open Products Facts',
  manual: 'inserito da te',
}

function Riga({ etichetta, valore, sub }: { etichetta: string; valore?: string; sub?: boolean }) {
  if (!valore) return null
  return (
    <tr className={sub ? 'sub' : undefined}>
      <th scope="row">{etichetta}</th>
      <td>{valore}</td>
    </tr>
  )
}

export function ProductView({ prodotto: p, daCache, onAggiorna }: Props) {
  const origine = gs1Origin(p.barcode)
  const nutri = p.nutriScore ? nutriScoreInfo(p.nutriScore) : undefined
  const nova = p.nova ? novaInfo(p.nova) : undefined
  const analisi = p.analysisTags.map((t) => ANALISI[t]).filter(Boolean)
  const etichetteUtili = p.labelTags.slice(0, 8)

  return (
    <article className="pv">
      {p.kind !== 'alimento' && (
        <div className="notice notice-warn">
          Questo codice non risulta un alimento: è stato trovato fra i{' '}
          {p.kind === 'cosmetico' ? 'cosmetici' : p.kind === 'petfood' ? 'prodotti per animali' : 'prodotti non alimentari'}.
        </div>
      )}

      <header className="pv-head">
        {p.imageUrl ? (
          <img className="pv-photo" src={p.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="pv-photo" aria-hidden="true" />
        )}
        <div>
          <h1 className="pv-title">{p.name ?? 'Prodotto senza nome nel database'}</h1>
          <p className="pv-brand">
            {p.brands.length ? p.brands.join(' · ') : 'Marca non indicata'}
            {p.quantity ? ` — ${p.quantity}` : ''}
          </p>
          <p className="pv-code mono">
            {formatBarcode(p.barcode)}
            {origine ? ` · registrato in ${origine}` : ''}
          </p>
        </div>
      </header>

      {(nutri || nova || analisi.length > 0) && (
        <div className="badges">
          {p.nutriScore && nutri && (
            <span className="nutri">
              <span className={`nutri-letter nutri-${p.nutriScore}`}>{p.nutriScore}</span>
              <span className="nutri-txt">
                <b>Nutri-Score {p.nutriScore.toUpperCase()}</b>
                <span>{nutri}</span>
              </span>
            </span>
          )}
          {nova && (
            <span className="chip chip-accent" title={nova.spiega}>
              NOVA {p.nova} · {nova.titolo}
            </span>
          )}
          {analisi.map((a) => (
            <span
              key={a.testo}
              className={`chip ${a.tono === 'ok' ? 'chip-ok' : a.tono === 'warn' ? 'chip-warn' : ''}`}
            >
              {a.testo}
            </span>
          ))}
        </div>
      )}

      {!p.nutriScore && (
        <p className="missing">
          Nutri-Score non disponibile per questo prodotto: nel database mancano i dati per calcolarlo.
        </p>
      )}

      <section className="card">
        <h3>Allergeni dichiarati</h3>
        {p.allergenTags.length > 0 ? (
          <div className="badges">
            {p.allergenTags.map((t) => (
              <span key={t} className="chip chip-bad">
                {traduciAllergene(t)}
              </span>
            ))}
          </div>
        ) : hasIngredients(p) ? (
          <p>Nessun allergene indicato nella scheda.</p>
        ) : (
          <p className="missing">
            Non lo so: senza l’elenco degli ingredienti non posso dire nulla sugli allergeni. Leggi l’etichetta.
          </p>
        )}

        {p.traceTags.length > 0 && (
          <>
            <h3 style={{ marginTop: 14 }}>Può contenere tracce di</h3>
            <div className="badges">
              {p.traceTags.map((t) => (
                <span key={t} className="chip chip-warn">
                  {traduciAllergene(t)}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h3>Ingredienti</h3>
        {hasIngredients(p) ? (
          <>
            <p>{p.ingredientsText}</p>
            {p.ingredientsLang && p.ingredientsLang !== 'it' && (
              <p className="missing" style={{ marginTop: 10 }}>
                Elenco disponibile solo in un’altra lingua ({p.ingredientsLang}).
              </p>
            )}
          </>
        ) : (
          <p className="missing">
            Ingredienti non presenti nel database. È il dato che manca più spesso sui prodotti italiani.
          </p>
        )}
      </section>

      <section className="card">
        <h3>Valori per 100 g o 100 ml</h3>
        {hasNutrition(p) ? (
          <table className="nutri-table">
            <tbody>
              <Riga etichetta="Energia" valore={energia(p.nutriments.energyKcal)} />
              <Riga etichetta="Grassi" valore={numero(p.nutriments.fat, 'g')} />
              <Riga etichetta="di cui saturi" valore={numero(p.nutriments.saturatedFat, 'g')} sub />
              <Riga etichetta="Carboidrati" valore={numero(p.nutriments.carbohydrates, 'g')} />
              <Riga etichetta="di cui zuccheri" valore={numero(p.nutriments.sugars, 'g')} sub />
              <Riga etichetta="Fibre" valore={numero(p.nutriments.fiber, 'g')} />
              <Riga etichetta="Proteine" valore={numero(p.nutriments.proteins, 'g')} />
              <Riga etichetta="Sale" valore={numero(p.nutriments.salt, 'g', 2)} />
            </tbody>
          </table>
        ) : (
          <p className="missing">Tabella nutrizionale non presente nel database.</p>
        )}
      </section>

      {p.additiveTags.length > 0 && (
        <section className="card">
          <h3>Additivi ({p.additiveTags.length})</h3>
          <ul className="list">
            {p.additiveTags.map((t) => {
              const a = descriviAdditivo(t)
              return (
                <li key={t}>
                  <span className="e">{a.sigla}</span>
                  <span>
                    {a.nome ?? 'nome non in archivio'}
                    {a.categoria ? ` — ${a.categoria}` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {etichetteUtili.length > 0 && (
        <section className="card">
          <h3>Etichette e certificazioni</h3>
          <div className="badges">
            {etichetteUtili.map((t) => (
              <span key={t} className="chip">
                {traduciEtichetta(t)}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="source">
        Dati da{' '}
        {p.sourceUrl ? (
          <a href={p.sourceUrl} target="_blank" rel="noreferrer noopener">
            {NOMI_FONTE[p.source] ?? p.source}
          </a>
        ) : (
          (NOMI_FONTE[p.source] ?? p.source)
        )}
        , licenza ODbL. Scheda scaricata {quando(p.fetchedAt)}
        {daCache ? ' e conservata sul dispositivo' : ''}.{' '}
        <button type="button" className="btn btn-quiet" onClick={onAggiorna}>
          Aggiorna
        </button>
      </div>

      <p className="disclaimer">
        FoodCheck riporta quello che il database contiene, e le formulazioni cambiano più in fretta dei
        database. Per allergie e intolleranze fa fede sempre l’etichetta sulla confezione. Non è un
        dispositivo medico.
      </p>
    </article>
  )
}
