import type { NovaGroup, NutriScore } from '../types/product'
import { novaInfo, nutriScoreInfo } from '../lib/dictionaries/tags'
import { TESTO_LIVELLO, type Semaforo } from '../lib/nutrition'

const LETTERE: NutriScore[] = ['a', 'b', 'c', 'd', 'e']

/** La scala completa A-E con la lettera del prodotto ingrandita.
 *  Mostrare tutta la scala e non solo la lettera serve a dare la misura:
 *  una D da sola non dice nulla, una D vicino alla E sì. */
export function NutriScala({ voto }: { voto: NutriScore }) {
  return (
    <div className="nutri">
      <div className="nutri-scala" role="img" aria-label={`Nutri-Score ${voto.toUpperCase()} su una scala da A a E`}>
        {LETTERE.map((l) => (
          <span key={l} className={`nutri-${l}`} data-attivo={l === voto} data-lettera={l} aria-hidden="true">
            {l}
          </span>
        ))}
      </div>
      <p className="nutri-testo">{nutriScoreInfo(voto)}</p>
    </div>
  )
}

/** NOVA come quattro gradini crescenti: il quarto, quello degli
 *  ultra-processati, è l'unico che si colora di rosso. */
export function NovaGradini({ gruppo }: { gruppo: NovaGroup }) {
  const info = novaInfo(gruppo)
  return (
    <div className="nova">
      <div className="nova-barre" data-gruppo={gruppo} role="img" aria-label={`Gruppo NOVA ${gruppo} su 4`}>
        {[1, 2, 3, 4].map((n) => (
          <i key={n} data-pieno={n <= gruppo} />
        ))}
      </div>
      <p className="nutri-testo">
        <strong>{info.titolo}</strong>
        <br />
        {info.spiega}
      </p>
    </div>
  )
}

/** Barre con le due tacche delle soglie ufficiali: si vede dove cade il
 *  valore, non solo di che colore è. */
export function Semafori({ dati }: { dati: Semaforo[] }) {
  return (
    <div className="semafori">
        {dati.map((s) => (
          <div className="sem" key={s.chiave} data-livello={s.livello}>
            <span className="sem-nome">{s.etichetta}</span>
            <span className="sem-valore">
              {s.valore === undefined
                ? 'non indicato'
                : `${s.valore.toLocaleString('it-IT', { maximumFractionDigits: 2 })} ${s.unita}`}
              {s.valore !== undefined && <b>{TESTO_LIVELLO[s.livello]}</b>}
            </span>
            <div className="sem-barra">
              <u style={{ width: `${s.posizione * 100}%` }} />
              <em style={{ left: `${s.tacche.bassa * 100}%` }} aria-hidden="true" />
              <em style={{ left: `${s.tacche.alta * 100}%` }} aria-hidden="true" />
            </div>
          </div>
        ))}
    </div>
  )
}
