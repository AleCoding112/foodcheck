import type { Product } from '../types/product'

/** Soglie ufficiali usate sulle etichette a semaforo britanniche (FSA), le
 *  stesse che l'Unione Europea considera riferimento per il fronte confezione.
 *  Sono per 100 g di solido e per 100 ml di bevanda, che hanno limiti diversi:
 *  un succo con 10 g di zucchero non è come un biscotto con 10 g. */

export type Livello = 'basso' | 'medio' | 'alto' | 'ignoto'

interface Soglia {
  bassa: number
  alta: number
}

interface Definizione {
  chiave: 'fat' | 'saturatedFat' | 'sugars' | 'salt'
  etichetta: string
  unita: string
  /** Frasi già concordate: "Zuccheri alti" ma "Sale alto". */
  frasi: { alto: string; basso: string }
  solido: Soglia
  bevanda: Soglia
}

const DEFINIZIONI: Definizione[] = [
  { chiave: 'fat', etichetta: 'Grassi', unita: 'g', frasi: { alto: 'Grassi alti', basso: 'Pochi grassi' }, solido: { bassa: 3, alta: 17.5 }, bevanda: { bassa: 1.5, alta: 8.75 } },
  { chiave: 'saturatedFat', etichetta: 'Saturi', unita: 'g', frasi: { alto: 'Grassi saturi alti', basso: 'Pochi saturi' }, solido: { bassa: 1.5, alta: 5 }, bevanda: { bassa: 0.75, alta: 2.5 } },
  { chiave: 'sugars', etichetta: 'Zuccheri', unita: 'g', frasi: { alto: 'Zuccheri alti', basso: 'Pochi zuccheri' }, solido: { bassa: 5, alta: 22.5 }, bevanda: { bassa: 2.5, alta: 11.25 } },
  { chiave: 'salt', etichetta: 'Sale', unita: 'g', frasi: { alto: 'Sale alto', basso: 'Poco sale' }, solido: { bassa: 0.3, alta: 1.5 }, bevanda: { bassa: 0.3, alta: 0.75 } },
]

export interface Semaforo {
  chiave: string
  etichetta: string
  frasi: { alto: string; basso: string }
  valore?: number
  unita: string
  livello: Livello
  /** Posizione del valore sulla barra, da 0 a 1. */
  posizione: number
  /** Dove cadono le due soglie sulla stessa barra, per disegnare i riferimenti. */
  tacche: { bassa: number; alta: number }
}

export function eBevanda(p: Product): boolean {
  return p.categoryTags.some((t) => t.includes('beverage') || t.includes('drink'))
}

function livelloDi(valore: number, s: Soglia): Livello {
  if (valore <= s.bassa) return 'basso'
  if (valore > s.alta) return 'alto'
  return 'medio'
}

/** La barra arriva al doppio della soglia alta: così un valore fuori scala
 *  resta leggibile invece di sfondare, e le due tacche cadono sempre nello
 *  stesso punto per tutti i nutrienti. */
export function semafori(p: Product): Semaforo[] {
  const bevanda = eBevanda(p)
  return DEFINIZIONI.map((d) => {
    const soglia = bevanda ? d.bevanda : d.solido
    const valore = p.nutriments[d.chiave]
    const fondoscala = soglia.alta * 2
    return {
      chiave: d.chiave,
      etichetta: d.etichetta,
      frasi: d.frasi,
      valore,
      unita: d.unita,
      livello: valore === undefined ? 'ignoto' : livelloDi(valore, soglia),
      posizione: valore === undefined ? 0 : Math.min(1, valore / fondoscala),
      tacche: { bassa: soglia.bassa / fondoscala, alta: soglia.alta / fondoscala },
    }
  })
}

export const TESTO_LIVELLO: Record<Livello, string> = {
  basso: 'basso',
  medio: 'medio',
  alto: 'alto',
  ignoto: 'non indicato',
}

/** Riassunto in una riga sola, per la parte di scheda che si vede per prima. */
export function riassunto(p: Product): { alti: string[]; bassi: string[] } {
  const s = semafori(p)
  return {
    alti: s.filter((x) => x.livello === 'alto').map((x) => x.frasi.alto),
    bassi: s.filter((x) => x.livello === 'basso').map((x) => x.frasi.basso),
  }
}
