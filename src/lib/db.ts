import Dexie, { type Table } from 'dexie'
import type { Product } from '../types/product'

/** Tutto vive sul dispositivo: non esiste un server, non esiste un account.
 *  Le tabelle di profilo e dispensa sono gia' dichiarate qui anche se le
 *  useranno le fasi 2 e 3: definirle adesso evita una migrazione dei dati
 *  a chi avra' gia' installato l'app.
 *
 *  `profileId` compare fin da subito perche' la struttura regge piu' persone
 *  in famiglia, anche se l'interfaccia ne mostra una sola. */

export interface ProdottoInCache {
  barcode: string
  /** null = il prodotto e' stato cercato e non esiste. Anche questo va ricordato,
   *  altrimenti ogni riapertura della schermata ripete la ricerca a vuoto. */
  product: Product | null
  fetchedAt: number
}

export interface Scansione {
  id?: number
  barcode: string
  at: number
  name?: string
  brand?: string
  image?: string
  trovato: boolean
}

export interface Profilo {
  id: string
  nome: string
  /** Tag allergeni nel formato di Open Food Facts, es. "en:milk". Fase 2. */
  allergeni: string[]
  diete: string[]
  daEvitare: string[]
  creatoIl: number
}

export interface VoceDispensa {
  id?: number
  profileId: string
  barcode: string
  nome?: string
  quantita: number
  luogo: 'frigo' | 'dispensa' | 'freezer'
  scadeIl?: number
  aggiuntoIl: number
}

class FoodCheckDB extends Dexie {
  prodotti!: Table<ProdottoInCache, string>
  scansioni!: Table<Scansione, number>
  profili!: Table<Profilo, string>
  dispensa!: Table<VoceDispensa, number>

  constructor() {
    super('foodcheck')
    this.version(1).stores({
      prodotti: 'barcode, fetchedAt',
      scansioni: '++id, barcode, at',
      profili: 'id',
      dispensa: '++id, profileId, barcode, scadeIl',
    })
  }
}

export const db = new FoodCheckDB()

/** Quanto teniamo buono un dato prima di riscaricarlo. */
export const VALIDITA_TROVATO = 30 * 24 * 60 * 60 * 1000
export const VALIDITA_NON_TROVATO = 24 * 60 * 60 * 1000

export async function leggiCache(barcode: string): Promise<ProdottoInCache | undefined> {
  try {
    const riga = await db.prodotti.get(barcode)
    if (!riga) return undefined
    const validita = riga.product ? VALIDITA_TROVATO : VALIDITA_NON_TROVATO
    if (Date.now() - riga.fetchedAt > validita) return undefined
    return riga
  } catch {
    // Navigazione privata o spazio esaurito: l'app deve funzionare lo stesso,
    // solo senza memoria fra una sessione e l'altra.
    return undefined
  }
}

export async function scriviCache(barcode: string, product: Product | null): Promise<void> {
  try {
    await db.prodotti.put({ barcode, product, fetchedAt: Date.now() })
  } catch {
    /* vedi sopra: la cache e' un lusso, non un requisito */
  }
}

export async function registraScansione(s: Omit<Scansione, 'id'>): Promise<void> {
  try {
    // Una riga per prodotto: rileggere lo stesso codice aggiorna la data
    // invece di riempire lo storico di doppioni.
    const esistente = await db.scansioni.where('barcode').equals(s.barcode).first()
    if (esistente?.id != null) await db.scansioni.update(esistente.id, s)
    else await db.scansioni.add(s)
  } catch {
    /* ignorato di proposito */
  }
}

export async function ultimeScansioni(limite = 12): Promise<Scansione[]> {
  try {
    return await db.scansioni.orderBy('at').reverse().limit(limite).toArray()
  } catch {
    return []
  }
}

export async function svuotaStorico(): Promise<void> {
  await db.scansioni.clear()
}
