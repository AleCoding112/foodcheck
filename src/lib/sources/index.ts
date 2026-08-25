import { ApiError, siamoOffline } from '../http'
import { isInternalCode, isValidGtin, lookupCandidates, normalizeBarcode } from '../barcode'
import { leggiCache, scriviCache } from '../db'
import type { Resolution } from '../../types/product'
import { FLAVORS, cercaSuFlavor } from './openfoodfacts'

export interface OpzioniRicerca {
  /** Ignora la cache e riscarica. Serve al pulsante "aggiorna". */
  forza?: boolean
}

/** La catena completa: cache locale, poi i quattro database aperti, poi la resa.
 *  Si ferma al primo risultato utile. */
export async function cercaProdotto(codiceGrezzo: string, opt: OpzioniRicerca = {}): Promise<Resolution> {
  const codice = normalizeBarcode(codiceGrezzo)

  if (codice.length < 8) {
    return { status: 'errore', barcode: codice, message: 'Il codice è troppo corto per essere un codice a barre.' }
  }

  const candidati = lookupCandidates(codice)
  const principale = candidati[0]

  // Nessuno di questi codici esiste fuori dal punto vendita che li ha stampati.
  if (isInternalCode(principale)) {
    return { status: 'codice-interno', barcode: principale }
  }

  if (!opt.forza) {
    const inCache = await leggiCache(principale)
    if (inCache) {
      return inCache.product
        ? { status: 'trovato', product: inCache.product, fromCache: true }
        : { status: 'non-trovato', barcode: principale }
    }
  }

  if (siamoOffline()) {
    return { status: 'offline', barcode: principale }
  }

  let erroreDiRete: ApiError | undefined

  for (const flavor of FLAVORS) {
    for (const candidato of candidati) {
      try {
        const prodotto = await cercaSuFlavor(flavor, candidato)
        if (prodotto) {
          await scriviCache(principale, prodotto)
          return { status: 'trovato', product: prodotto, fromCache: false }
        }
      } catch (err) {
        // Un database irraggiungibile non deve interrompere la catena:
        // gli altri potrebbero rispondere. L'errore lo teniamo da parte e
        // lo usiamo solo se nessuno risponde.
        if (err instanceof ApiError) erroreDiRete = err
        else erroreDiRete = new ApiError('offline', 'Errore imprevisto durante la ricerca.')
      }
    }
  }

  if (erroreDiRete) {
    return erroreDiRete.kind === 'offline'
      ? { status: 'offline', barcode: principale }
      : { status: 'errore', barcode: principale, message: erroreDiRete.message }
  }

  // Nessun errore e nessuna risposta: il prodotto davvero non c'è.
  await scriviCache(principale, null)
  return { status: 'non-trovato', barcode: principale }
}

/** Vero se il codice supera la cifra di controllo. Un codice che non la supera
 *  e' quasi sempre una lettura sbagliata, non un prodotto sconosciuto. */
export function codiceAttendibile(codice: string): boolean {
  return lookupCandidates(codice).some(isValidGtin)
}
