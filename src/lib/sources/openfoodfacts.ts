import { getJson } from '../http'
import type { NovaGroup, NutriScore, Nutriments, Product, ProductKind, SourceId } from '../../types/product'

/** I quattro database della famiglia Open Food Facts parlano la stessa API.
 *  Interrogarli in fila serve soprattutto a distinguere "prodotto sconosciuto"
 *  da "questo non e' un alimento": inquadrare un bagnoschiuma deve dare una
 *  risposta sensata, non un errore. */
export interface Flavor {
  id: SourceId
  host: string
  kind: ProductKind
  etichetta: string
}

export const FLAVORS: Flavor[] = [
  { id: 'openfoodfacts', host: 'world.openfoodfacts.org', kind: 'alimento', etichetta: 'Open Food Facts' },
  { id: 'openbeautyfacts', host: 'world.openbeautyfacts.org', kind: 'cosmetico', etichetta: 'Open Beauty Facts' },
  { id: 'openpetfoodfacts', host: 'world.openpetfoodfacts.org', kind: 'petfood', etichetta: 'Open Pet Food Facts' },
  { id: 'openproductsfacts', host: 'world.openproductsfacts.org', kind: 'altro', etichetta: 'Open Products Facts' },
]

const CAMPI = [
  'code',
  'product_name',
  'product_name_it',
  'generic_name',
  'generic_name_it',
  'brands',
  'quantity',
  'lang',
  'image_front_url',
  'image_front_small_url',
  'ingredients_text',
  'ingredients_text_it',
  'ingredients_analysis_tags',
  'allergens_tags',
  'traces_tags',
  'additives_tags',
  'labels_tags',
  'categories_tags',
  'nutriscore_grade',
  'nutrition_grades',
  'nova_group',
  'nutriments',
  'countries_tags',
].join(',')

/** Il browser non permette di impostare l'intestazione User-Agent, che l'API
 *  chiede per riconoscere le applicazioni. I parametri app_name e app_version
 *  servono esattamente a questo quando la chiamata parte da una pagina web. */
const IDENTIFICAZIONE = 'app_name=FoodCheck&app_version=0.1.0'

interface RispostaOFF {
  status?: number
  code?: string
  product?: Record<string, unknown>
}

function testo(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length ? t : undefined
}

function numero(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

function tags(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function leggiNutrienti(v: unknown): Nutriments {
  const n = (v ?? {}) as Record<string, unknown>
  const out: Nutriments = {
    energyKcal: numero(n['energy-kcal_100g']),
    fat: numero(n['fat_100g']),
    saturatedFat: numero(n['saturated-fat_100g']),
    carbohydrates: numero(n['carbohydrates_100g']),
    sugars: numero(n['sugars_100g']),
    fiber: numero(n['fiber_100g']),
    proteins: numero(n['proteins_100g']),
    salt: numero(n['salt_100g']),
  }
  // Alcune schede hanno solo i kJ: la conversione e' esatta, non una stima.
  if (out.energyKcal === undefined) {
    const kj = numero(n['energy-kj_100g']) ?? numero(n['energy_100g'])
    if (kj !== undefined) out.energyKcal = Math.round(kj / 4.184)
  }
  return out
}

export function normalizza(grezzo: Record<string, unknown>, flavor: Flavor, barcode: string): Product {
  const ingredientiIt = testo(grezzo['ingredients_text_it'])
  const ingredienti = ingredientiIt ?? testo(grezzo['ingredients_text'])
  const grade = testo(grezzo['nutriscore_grade']) ?? testo(grezzo['nutrition_grades'])
  const nutriScore = grade && 'abcde'.includes(grade.toLowerCase()) && grade.length === 1
    ? (grade.toLowerCase() as NutriScore)
    : undefined
  const novaGrezzo = numero(grezzo['nova_group'])
  const nova = novaGrezzo && novaGrezzo >= 1 && novaGrezzo <= 4 ? (novaGrezzo as NovaGroup) : undefined

  return {
    barcode: testo(grezzo['code']) ?? barcode,
    name:
      testo(grezzo['product_name_it']) ??
      testo(grezzo['product_name']) ??
      testo(grezzo['generic_name_it']) ??
      testo(grezzo['generic_name']),
    brands: (testo(grezzo['brands']) ?? '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean),
    quantity: testo(grezzo['quantity']),
    imageUrl: testo(grezzo['image_front_url']) ?? testo(grezzo['image_front_small_url']),
    ingredientsText: ingredienti,
    ingredientsLang: ingredienti ? (ingredientiIt ? 'it' : testo(grezzo['lang']) ?? 'sconosciuta') : undefined,
    allergenTags: tags(grezzo['allergens_tags']),
    traceTags: tags(grezzo['traces_tags']),
    additiveTags: tags(grezzo['additives_tags']),
    labelTags: tags(grezzo['labels_tags']),
    categoryTags: tags(grezzo['categories_tags']),
    analysisTags: tags(grezzo['ingredients_analysis_tags']),
    nutriScore,
    nova,
    nutriments: leggiNutrienti(grezzo['nutriments']),
    kind: flavor.kind,
    source: flavor.id,
    sourceUrl: `https://${flavor.host}/product/${testo(grezzo['code']) ?? barcode}`,
    fetchedAt: Date.now(),
  }
}

/** Cerca un singolo codice in un singolo database.
 *  null significa "questo database non lo conosce", e non e' un errore. */
export async function cercaSuFlavor(flavor: Flavor, barcode: string): Promise<Product | null> {
  const url = `https://${flavor.host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${CAMPI}&${IDENTIFICAZIONE}`
  const risposta = await getJson<RispostaOFF>(url, { accettaNonTrovato: true })
  if (!risposta || risposta.status !== 1 || !risposta.product) return null
  const prodotto = normalizza(risposta.product, flavor, barcode)
  // Una scheda senza nome ne' ingredienti e' un guscio vuoto: qualcuno ha
  // registrato il codice e non ha inserito nulla. Meglio trattarla come assente.
  if (!prodotto.name && !prodotto.ingredientsText && !prodotto.imageUrl) return null
  return prodotto
}
