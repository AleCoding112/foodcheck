import type { Product } from '../types/product'
import { hasIngredients, hasNutrition } from '../types/product'
import { formatBarcode, gs1Origin } from '../lib/barcode'
import { additiviDistinti, descriviAdditivo } from '../lib/dictionaries/additivi'
import { ANALISI, traduciAllergene, traduciEtichetta } from '../lib/dictionaries/tags'
import { riassunto, semafori } from '../lib/nutrition'
import { energia, numero, quando } from '../lib/format'
import { NovaGradini, NutriScala, Semafori } from './Indicatori'

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
  manual: 'te',
}

function Riga({ voce, valore, dentro }: { voce: string; valore?: string; dentro?: boolean }) {
  if (!valore) return null
  return (
    <tr className={dentro ? 'dentro' : undefined}>
      <th scope="row">{voce}</th>
      <td>{valore}</td>
    </tr>
  )
}

export function SchedaProdotto({ prodotto: p, daCache, onAggiorna }: Props) {
  const origine = gs1Origin(p.barcode)
  // Il database accumula marche fantasiose sullo stesso prodotto ("Nutella,
  // Ferrero, Yum yum"): si tengono le prime due e si scarta quella che ripete
  // il nome del prodotto.
  const marche = p.brands
    .filter((b) => b.toLowerCase() !== (p.name ?? '').toLowerCase())
    .slice(0, 2)
  const additivi = additiviDistinti(p.additiveTags)
  const analisi = p.analysisTags.map((t) => ANALISI[t]).filter(Boolean)
  const nutrienti = semafori(p)
  const { alti } = riassunto(p)

  return (
    <div className="foglio-corpo">
      {p.kind !== 'alimento' && (
        <p className="gettone gettone-medio" style={{ marginBottom: 12 }}>
          Non è un alimento — trovato fra i{' '}
          {p.kind === 'cosmetico' ? 'cosmetici' : p.kind === 'petfood' ? 'prodotti per animali' : 'prodotti non alimentari'}
        </p>
      )}

      <header className="scheda-testa">
        {p.imageUrl ? (
          <img className="scheda-foto" src={p.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="scheda-foto" aria-hidden="true" />
        )}
        <div>
          <h2 className="scheda-nome">{p.name ?? 'Prodotto senza nome nel database'}</h2>
          <p className="scheda-marca">
            {marche.length ? marche.join(' · ') : 'Marca non indicata'}
            {p.quantity ? ` — ${p.quantity}` : ''}
          </p>
          <p className="scheda-codice">
            {formatBarcode(p.barcode)}
            {origine ? ` · ${origine}` : ''}
          </p>
        </div>
      </header>

      {/* Una riga sola con quello che si vorrebbe sapere senza leggere il resto. */}
      <div className="verdetto">
        {alti.map((x) => (
          <span key={x} className="gettone gettone-alto">
            {x}
          </span>
        ))}
        {analisi.map((a) => (
          <span
            key={a.testo}
            className={`gettone ${a.tono === 'ok' ? 'gettone-basso' : a.tono === 'warn' ? 'gettone-medio' : ''}`}
          >
            {a.testo}
          </span>
        ))}
        {additivi.length > 0 && (
          <span className="gettone">
            {additivi.length} additiv{additivi.length === 1 ? 'o' : 'i'}
          </span>
        )}
        {!hasIngredients(p) && !hasNutrition(p) && (
          <span className="gettone gettone-nota">scheda quasi vuota nel database</span>
        )}
      </div>

      <section className="blocco">
        <span className="etichetta">Allergeni dichiarati</span>
        {p.allergenTags.length > 0 ? (
          <div className="allergeni">
            {p.allergenTags.map((t) => (
              <span key={t} className="allergene">
                {traduciAllergene(t)}
              </span>
            ))}
            {p.traceTags.map((t) => (
              <span key={t} className="allergene allergene-traccia">
                tracce di {traduciAllergene(t).toLowerCase()}
              </span>
            ))}
          </div>
        ) : hasIngredients(p) ? (
          <p className="assente">Nessun allergene indicato nella scheda.</p>
        ) : (
          <p className="assente">
            <strong>Non lo so.</strong> Senza l’elenco degli ingredienti non posso dire nulla sugli
            allergeni: leggi l’etichetta sulla confezione.
          </p>
        )}
      </section>

      {(p.nutriScore || p.nova) && (
        <section className="blocco">
          <span className="etichetta">Giudizio</span>
          {p.nutriScore && <NutriScala voto={p.nutriScore} />}
          {p.nova && <div style={{ marginTop: p.nutriScore ? 18 : 0 }}><NovaGradini gruppo={p.nova} /></div>}
        </section>
      )}

      {hasNutrition(p) && (
        <section className="blocco">
          <span className="etichetta">Quanto ne contiene, per 100 {p.quantity?.includes('ml') ? 'ml' : 'g'}</span>
          <Semafori dati={nutrienti} />
          <p className="assente" style={{ marginTop: 14 }}>
            Le due tacche sono le soglie ufficiali fra basso, medio e alto.
          </p>
        </section>
      )}

      <section className="blocco">
        <span className="etichetta">Valori medi</span>
        {hasNutrition(p) ? (
          <table className="tabella">
            <tbody>
              <Riga voce="Energia" valore={energia(p.nutriments.energyKcal)} />
              <Riga voce="Grassi" valore={numero(p.nutriments.fat, 'g')} />
              <Riga voce="di cui saturi" valore={numero(p.nutriments.saturatedFat, 'g')} dentro />
              <Riga voce="Carboidrati" valore={numero(p.nutriments.carbohydrates, 'g')} />
              <Riga voce="di cui zuccheri" valore={numero(p.nutriments.sugars, 'g')} dentro />
              <Riga voce="Fibre" valore={numero(p.nutriments.fiber, 'g')} />
              <Riga voce="Proteine" valore={numero(p.nutriments.proteins, 'g')} />
              <Riga voce="Sale" valore={numero(p.nutriments.salt, 'g', 2)} />
            </tbody>
          </table>
        ) : (
          <p className="assente">Tabella nutrizionale non presente nel database.</p>
        )}
      </section>

      <section className="blocco">
        <span className="etichetta">Ingredienti</span>
        {hasIngredients(p) ? (
          <>
            <p>{p.ingredientsText}</p>
            {p.ingredientsLang && p.ingredientsLang !== 'it' && (
              <p className="assente" style={{ marginTop: 10 }}>
                Elenco disponibile solo in un’altra lingua ({p.ingredientsLang}).
              </p>
            )}
          </>
        ) : (
          <p className="assente">
            Ingredienti non presenti nel database. È il dato che manca più spesso sui prodotti italiani.
          </p>
        )}
      </section>

      {additivi.length > 0 && (
        <section className="blocco">
          <span className="etichetta">Additivi</span>
          <dl className="additivi">
            {additivi.map((t) => {
              const a = descriviAdditivo(t)
              return (
                <div className="additivo" key={t}>
                  <dt>{a.sigla}</dt>
                  <dd>
                    {a.nome ?? 'nome non in archivio'}
                    {a.categoria ? ` — ${a.categoria}` : ''}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      )}

      {p.labelTags.length > 0 && (
        <section className="blocco">
          <span className="etichetta">Etichette</span>
          <div className="allergeni">
            {p.labelTags.slice(0, 8).map((t) => (
              <span key={t} className="gettone">
                {traduciEtichetta(t)}
              </span>
            ))}
          </div>
        </section>
      )}

      <p className="fonte">
        Dati da{' '}
        {p.sourceUrl ? (
          <a href={p.sourceUrl} target="_blank" rel="noreferrer noopener">
            {NOMI_FONTE[p.source] ?? p.source}
          </a>
        ) : (
          (NOMI_FONTE[p.source] ?? p.source)
        )}
        , licenza ODbL · scheda {quando(p.fetchedAt)}
        {daCache ? ', conservata sul dispositivo' : ''} ·{' '}
        <button type="button" className="bottone-piatto" onClick={onAggiorna}>
          aggiorna
        </button>
      </p>

      <p className="avvertenza">
        Le formulazioni cambiano più in fretta dei database. Per allergie e intolleranze fa fede
        l’etichetta sulla confezione. Non è un dispositivo medico.
      </p>
    </div>
  )
}
