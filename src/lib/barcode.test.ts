import { describe, expect, it } from 'vitest'
import {
  formatBarcode,
  gs1Origin,
  isInternalCode,
  isValidGtin,
  lookupCandidates,
  normalizeBarcode,
  toGtin13,
  upcEToUpcA,
} from './barcode'

describe('normalizeBarcode', () => {
  it('tiene solo le cifre', () => {
    expect(normalizeBarcode(' 8000 500-310427 ')).toBe('8000500310427')
    expect(normalizeBarcode('abc')).toBe('')
  })
})

describe('isValidGtin', () => {
  it('accetta codici reali', () => {
    expect(isValidGtin('3017620422003')).toBe(true)   // Nutella, EAN-13
    expect(isValidGtin('8000500310427')).toBe(true)   // prefisso italiano
    expect(isValidGtin('96385074')).toBe(true)        // EAN-8
    expect(isValidGtin('012345678905')).toBe(true)    // UPC-A
  })

  it('rifiuta una cifra di controllo sbagliata', () => {
    expect(isValidGtin('3017620422004')).toBe(false)
  })

  it('rifiuta lunghezze impossibili e caratteri non numerici', () => {
    expect(isValidGtin('301762042200')).toBe(false)
    expect(isValidGtin('30176204220O3')).toBe(false)
  })
})

describe('toGtin13', () => {
  it('porta un UPC-A a 13 cifre', () => {
    expect(toGtin13('012345678905')).toBe('0012345678905')
  })

  it('toglie lo zero iniziale da un ITF-14', () => {
    expect(toGtin13('03017620422003')).toBe('3017620422003')
  })

  it('lascia invariato un EAN-13', () => {
    expect(toGtin13('3017620422003')).toBe('3017620422003')
  })
})

describe('upcEToUpcA', () => {
  it('espande la forma compatta', () => {
    expect(upcEToUpcA('04252614')).toBe('042100005264')
  })

  it('rifiuta ciò che non è UPC-E', () => {
    expect(upcEToUpcA('3017620422003')).toBeNull()
  })
})

describe('isInternalCode', () => {
  it('riconosce i codici stampati dal negozio', () => {
    expect(isInternalCode('2012345678909')).toBe(true)   // peso variabile
    expect(isInternalCode('0212345678905')).toBe(true)   // uso interno
  })

  it('non scambia un prodotto vero per un codice interno', () => {
    expect(isInternalCode('8000500310427')).toBe(false)
    expect(isInternalCode('3017620422003')).toBe(false)
  })
})

describe('gs1Origin', () => {
  it('riconosce i prefissi principali', () => {
    expect(gs1Origin('8000500310427')).toBe('Italia')
    expect(gs1Origin('3017620422003')).toBe('Francia')
    expect(gs1Origin('5449000000996')).toBe('Belgio o Lussemburgo')
  })

  it('non inventa un paese per codici troppo corti', () => {
    expect(gs1Origin('9638507')).toBeUndefined()
  })
})

describe('lookupCandidates', () => {
  it('per un EAN-13 propone un solo codice', () => {
    expect(lookupCandidates('3017620422003')).toEqual(['3017620422003'])
  })

  it('per un UPC-E propone anche la forma espansa', () => {
    const c = lookupCandidates('04252614')
    expect(c).toContain('04252614')          // forma corta, come stampata
    expect(c).toContain('0000004252614')     // riempita di zeri a 13 cifre
    expect(c).toContain('0042100005264')     // forma espansa UPC-A
  })
})

describe('formatBarcode', () => {
  it('spezza il codice come si legge sulla confezione', () => {
    expect(formatBarcode('8000500310427')).toBe('8 000500 310427')
    expect(formatBarcode('96385074')).toBe('9638 5074')
  })
})
