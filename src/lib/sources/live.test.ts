import { describe, expect, it } from 'vitest'
import { FLAVORS, cercaSuFlavor } from './openfoodfacts'

/** Prova contro l'API vera. Non fa parte della suite normale: richiede rete e
 *  dipende da dati che possono cambiare. Si esegue apposta:
 *
 *      FOODCHECK_LIVE=1 npm test
 */
const attivo = process.env.FOODCHECK_LIVE === '1'

describe.runIf(attivo)('Open Food Facts, chiamata reale', () => {
  it('trova un prodotto noto e lo normalizza', async () => {
    const p = await cercaSuFlavor(FLAVORS[0], '3017620422003')
    expect(p).not.toBeNull()
    expect(p!.name?.toLowerCase()).toContain('nutella')
    expect(p!.allergenTags).toContain('en:milk')
    expect(p!.ingredientsText).toBeTruthy()
    expect(p!.sourceUrl).toContain('openfoodfacts.org')
  }, 20000)

  // Nota emersa in fase di collaudo: codici "finti" come 9999999999994 o
  // 1234567890123 esistono davvero, sono schede di prova caricate da qualcuno.
  // Per verificare il caso "non trovato" serve un codice con cifra di controllo
  // valida ma mai registrato: l'API risponde 404.
  it('restituisce null, non un errore, per un codice inesistente', async () => {
    const p = await cercaSuFlavor(FLAVORS[0], '8000473829100')
    expect(p).toBeNull()
  }, 20000)

  it('riconosce un prodotto non alimentare nel database dei cosmetici', async () => {
    const alimenti = await cercaSuFlavor(FLAVORS[0], '3600541177741')
    const cosmetici = await cercaSuFlavor(FLAVORS[1], '3600541177741')
    expect(alimenti).toBeNull()
    expect(cosmetici?.kind).toBe('cosmetico')
  }, 25000)
})
