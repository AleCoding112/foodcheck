import { describe, expect, it } from 'vitest'
import { semafori, riassunto } from './nutrition'
import type { Product } from '../types/product'

function prodotto(nutriments: Product['nutriments'], categorie: string[] = []): Product {
  return {
    barcode: '1', brands: [], allergenTags: [], traceTags: [], additiveTags: [],
    labelTags: [], categoryTags: categorie, analysisTags: [], nutriments,
    kind: 'alimento', source: 'openfoodfacts', fetchedAt: 0,
  }
}

describe('semafori', () => {
  it('classifica un solido con le soglie per 100 g', () => {
    const s = semafori(prodotto({ fat: 30.9, saturatedFat: 10.6, sugars: 56.3, salt: 0.107 }))
    expect(s.map((x) => x.livello)).toEqual(['alto', 'alto', 'alto', 'basso'])
  })

  it('usa soglie più severe per le bevande', () => {
    // 12 g: sotto la soglia alta di un solido (22,5), sopra quella di una bevanda (11,25)
    const zuccheri = { sugars: 12 }
    expect(semafori(prodotto(zuccheri))[2].livello).toBe('medio')
    expect(semafori(prodotto(zuccheri, ['en:beverages']))[2].livello).toBe('alto')
  })

  it('non inventa un livello quando il valore manca', () => {
    const s = semafori(prodotto({}))
    expect(s.every((x) => x.livello === 'ignoto')).toBe(true)
    expect(s.every((x) => x.posizione === 0)).toBe(true)
  })

  it('tiene il valore dentro la barra anche se sfonda la scala', () => {
    const s = semafori(prodotto({ salt: 99 }))
    expect(s[3].posizione).toBe(1)
  })

  it('mette le tacche sempre negli stessi punti', () => {
    const s = semafori(prodotto({ fat: 1 }))
    expect(s[0].tacche.alta).toBe(0.5)
  })
})

describe('riassunto', () => {
  it('elenca solo ciò che è davvero alto o basso', () => {
    const r = riassunto(prodotto({ sugars: 56.3, salt: 0.1 }))
    expect(r.alti).toEqual(['Zuccheri alti'])
    expect(r.bassi).toEqual(['Poco sale'])
  })
})
