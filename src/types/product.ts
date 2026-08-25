/** Da dove arriva la scheda. L'ordine e' anche l'ordine della catena di ricerca. */
export type SourceId = 'openfoodfacts' | 'openbeautyfacts' | 'openpetfoodfacts' | 'openproductsfacts' | 'manual'

export type ProductKind = 'alimento' | 'cosmetico' | 'petfood' | 'altro'

export type NutriScore = 'a' | 'b' | 'c' | 'd' | 'e'
export type NovaGroup = 1 | 2 | 3 | 4

/** Valori per 100 g o 100 ml. Ogni campo puo' mancare: il database e' incompleto
 *  molto piu' spesso di quanto si immagini, e l'interfaccia deve dirlo. */
export interface Nutriments {
  energyKcal?: number
  fat?: number
  saturatedFat?: number
  carbohydrates?: number
  sugars?: number
  fiber?: number
  proteins?: number
  salt?: number
}

export interface Product {
  /** Codice normalizzato a 13 cifre quando possibile. E' la chiave in cache. */
  barcode: string
  name?: string
  brands: string[]
  quantity?: string
  imageUrl?: string
  ingredientsText?: string
  /** Lingua effettiva del testo ingredienti: se non e' italiano va detto. */
  ingredientsLang?: string
  allergenTags: string[]
  traceTags: string[]
  additiveTags: string[]
  labelTags: string[]
  categoryTags: string[]
  /** Etichette derivate dagli ingredienti: vegano, vegetariano, olio di palma. */
  analysisTags: string[]
  nutriScore?: NutriScore
  nova?: NovaGroup
  nutriments: Nutriments
  kind: ProductKind
  source: SourceId
  sourceUrl?: string
  /** Quando l'abbiamo scaricato: serve a dire "dato del 3 marzo" invece di far finta
   *  che sia sempre aggiornato. */
  fetchedAt: number
}

/** Il risultato di una ricerca. Gli stati sono distinti di proposito:
 *  "non trovato" e "non ho potuto controllare" sono due cose diverse. */
export type Resolution =
  | { status: 'trovato'; product: Product; fromCache: boolean }
  | { status: 'non-trovato'; barcode: string }
  | { status: 'codice-interno'; barcode: string }
  | { status: 'offline'; barcode: string }
  | { status: 'errore'; barcode: string; message: string }

export function hasIngredients(p: Product): boolean {
  return !!p.ingredientsText && p.ingredientsText.trim().length > 2
}

export function hasNutrition(p: Product): boolean {
  return Object.values(p.nutriments).some((v) => typeof v === 'number')
}
