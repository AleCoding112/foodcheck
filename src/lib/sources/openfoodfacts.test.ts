import { describe, expect, it } from 'vitest'
import { FLAVORS, normalizza } from './openfoodfacts'
import { additiviDistinti, descriviAdditivo } from '../dictionaries/additivi'
import { traduciAllergene } from '../dictionaries/tags'

const FOOD = FLAVORS[0]

/** Estratto reale della risposta dell'API per il codice della Nutella,
 *  ridotto ai campi che l'app usa. */
const NUTELLA = {
  code: '3017620422003',
  product_name: 'Nutella',
  brands: 'Nutella, Ferrero',
  ingredients_text_it:
    'Zucchero, olio di palma, nocciole 13%, latte scremato in polvere 8,7%, cacao magro 7,4%, emulsionanti: lecitina di soia',
  allergens_tags: ['en:milk', 'en:nuts', 'en:soybeans'],
  traces_tags: [],
  additives_tags: ['en:e322', 'en:e322i'],
  labels_tags: ['en:no-gluten'],
  nutriscore_grade: 'e',
  nova_group: 4,
  ingredients_analysis_tags: ['en:palm-oil', 'en:vegetarian'],
  nutriments: { 'energy-kcal_100g': 539, 'sugars_100g': 56.3, 'salt_100g': 0.107 },
}

describe('normalizza', () => {
  it('estrae i campi che servono a schermo', () => {
    const p = normalizza(NUTELLA, FOOD, '3017620422003')
    expect(p.name).toBe('Nutella')
    expect(p.brands).toEqual(['Nutella', 'Ferrero'])
    expect(p.nutriScore).toBe('e')
    expect(p.nova).toBe(4)
    expect(p.ingredientsLang).toBe('it')
    expect(p.nutriments.energyKcal).toBe(539)
    expect(p.nutriments.salt).toBe(0.107)
    expect(p.kind).toBe('alimento')
  })

  it('non inventa valori quando il dato manca', () => {
    const p = normalizza({ code: '1', product_name: 'X' }, FOOD, '1')
    expect(p.nutriScore).toBeUndefined()
    expect(p.nova).toBeUndefined()
    expect(p.nutriments.fat).toBeUndefined()
    expect(p.allergenTags).toEqual([])
  })

  it('converte i kilojoule in calorie quando mancano le kcal', () => {
    const p = normalizza({ code: '1', nutriments: { 'energy-kj_100g': 2252 } }, FOOD, '1')
    expect(p.nutriments.energyKcal).toBe(538)
  })

  it('scarta un Nutri-Score non valido invece di mostrarlo', () => {
    const p = normalizza({ code: '1', nutriscore_grade: 'unknown' }, FOOD, '1')
    expect(p.nutriScore).toBeUndefined()
  })

  it('segnala quando gli ingredienti non sono in italiano', () => {
    const p = normalizza({ code: '1', ingredients_text: 'Sugar, palm oil', lang: 'en' }, FOOD, '1')
    expect(p.ingredientsLang).toBe('en')
  })
})

describe('dizionari', () => {
  it('traduce gli allergeni obbligatori', () => {
    expect(traduciAllergene('en:milk')).toBe('Latte')
    expect(traduciAllergene('en:soybeans')).toBe('Soia')
  })

  it('non nasconde un allergene che non conosce', () => {
    expect(traduciAllergene('en:qualcosa-di-nuovo')).toBe('Qualcosa di nuovo')
  })

  it('dà un nome agli additivi, sottovarianti comprese', () => {
    expect(descriviAdditivo('en:e322')).toMatchObject({ sigla: 'E322', nome: 'Lecitine' })
    expect(descriviAdditivo('en:e322i')).toMatchObject({ sigla: 'E322i', nome: 'Lecitine' })
    expect(descriviAdditivo('en:e9999').nome).toBeUndefined()
  })

  it('non elenca due volte lo stesso additivo', () => {
    // Il database restituisce sia il capostipite sia la variante.
    expect(additiviDistinti(['en:e322', 'en:e322i'])).toEqual(['en:e322'])
    // Se c'è solo la variante, quella si tiene.
    expect(additiviDistinti(['en:e150d'])).toEqual(['en:e150d'])
    expect(additiviDistinti(['en:e322', 'en:e471'])).toEqual(['en:e322', 'en:e471'])
  })
})
