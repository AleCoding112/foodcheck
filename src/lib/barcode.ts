/** Utilita' sui codici a barre: validazione, normalizzazione, origine.
 *  Tutto qui dentro e' puro e testato in barcode.test.ts. */

export type GtinLength = 8 | 12 | 13 | 14

/** Toglie spazi, trattini e qualsiasi cosa non sia una cifra. */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D+/g, '')
}

/** Verifica la cifra di controllo GS1 (vale per EAN-8, UPC-A, EAN-13, ITF-14). */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code)) return false
  if (![8, 12, 13, 14].includes(code.length)) return false
  const digits = [...code].map(Number)
  const check = digits.pop() as number
  let sum = 0
  // Pesi 3 e 1 alternati, partendo da destra.
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) {
    sum += digits[i] * w
  }
  return (10 - (sum % 10)) % 10 === check
}

/** Porta il codice alla forma a 13 cifre usata da Open Food Facts.
 *  Un UPC-A a 12 cifre e' un EAN-13 con uno zero davanti. */
export function toGtin13(code: string): string {
  const c = normalizeBarcode(code)
  if (c.length === 12) return '0' + c
  if (c.length === 14 && c.startsWith('0')) return c.slice(1)
  return c
}

/** Espande un UPC-E a 8 cifre nel corrispondente UPC-A a 12.
 *  Serve perche' le confezioni piccole (lattine, monoporzioni) usano spesso UPC-E,
 *  ma nei database il prodotto e' registrato nella forma lunga. */
export function upcEToUpcA(code: string): string | null {
  const c = normalizeBarcode(code)
  if (c.length !== 8 || (c[0] !== '0' && c[0] !== '1')) return null
  const sys = c[0]
  const body = c.slice(1, 7)
  const check = c[7]
  const [a, b, cc, d, e, f] = body
  let mid: string
  switch (f) {
    case '0': case '1': case '2':
      mid = `${a}${b}${f}0000${cc}${d}${e}`
      break
    case '3':
      mid = `${a}${b}${cc}00000${d}${e}`
      break
    case '4':
      mid = `${a}${b}${cc}${d}00000${e}`
      break
    default:
      mid = `${a}${b}${cc}${d}${e}0000${f}`
      break
  }
  return sys + mid + check
}

/** Prefissi GS1 riservati all'uso interno dei negozi: bilance del banco
 *  gastronomia, etichette stampate in reparto, tessere fedelta'.
 *  Non esistono in nessun database mondiale, e dirlo subito e' piu' onesto
 *  che far cercare l'app a vuoto. */
export function isInternalCode(code: string): boolean {
  const c = toGtin13(normalizeBarcode(code))
  if (c.length !== 13) return false
  const p2 = c.slice(0, 2)
  const p3 = c.slice(0, 3)
  if (p2 === '02') return true                       // uso interno del punto vendita
  if (p2 >= '20' && p2 <= '29') return true          // prodotti a peso variabile
  if (p3 >= '040' && p3 <= '049') return true        // uso interno
  if (p3 >= '980' && p3 <= '999') return true        // buoni, coupon, riviste
  return false
}

interface Range { from: number; to: number; label: string }

/** Sottoinsieme dei prefissi GS1: i paesi che compaiono davvero sugli scaffali
 *  italiani. Il prefisso indica dove il produttore ha registrato il codice,
 *  non dove il prodotto e' stato fabbricato: l'interfaccia deve dirlo cosi'. */
const RANGES: Range[] = [
  { from: 0, to: 19, label: 'Stati Uniti o Canada' },
  { from: 30, to: 39, label: 'Stati Uniti' },
  { from: 50, to: 59, label: 'buoni sconto' },
  { from: 60, to: 139, label: 'Stati Uniti' },
  { from: 300, to: 379, label: 'Francia' },
  { from: 380, to: 380, label: 'Bulgaria' },
  { from: 383, to: 383, label: 'Slovenia' },
  { from: 385, to: 385, label: 'Croazia' },
  { from: 387, to: 387, label: 'Bosnia ed Erzegovina' },
  { from: 400, to: 440, label: 'Germania' },
  { from: 450, to: 459, label: 'Giappone' },
  { from: 460, to: 469, label: 'Russia' },
  { from: 471, to: 471, label: 'Taiwan' },
  { from: 479, to: 479, label: 'Sri Lanka' },
  { from: 480, to: 480, label: 'Filippine' },
  { from: 484, to: 484, label: 'Moldavia' },
  { from: 485, to: 485, label: 'Armenia' },
  { from: 489, to: 489, label: 'Hong Kong' },
  { from: 490, to: 499, label: 'Giappone' },
  { from: 500, to: 509, label: 'Regno Unito' },
  { from: 520, to: 521, label: 'Grecia' },
  { from: 528, to: 528, label: 'Libano' },
  { from: 529, to: 529, label: 'Cipro' },
  { from: 531, to: 531, label: 'Macedonia del Nord' },
  { from: 535, to: 535, label: 'Malta' },
  { from: 539, to: 539, label: 'Irlanda' },
  { from: 540, to: 549, label: 'Belgio o Lussemburgo' },
  { from: 560, to: 560, label: 'Portogallo' },
  { from: 569, to: 569, label: 'Islanda' },
  { from: 570, to: 579, label: 'Danimarca' },
  { from: 590, to: 590, label: 'Polonia' },
  { from: 594, to: 594, label: 'Romania' },
  { from: 599, to: 599, label: 'Ungheria' },
  { from: 600, to: 601, label: 'Sudafrica' },
  { from: 611, to: 611, label: 'Marocco' },
  { from: 613, to: 613, label: 'Algeria' },
  { from: 619, to: 619, label: 'Tunisia' },
  { from: 620, to: 620, label: 'Siria' },
  { from: 621, to: 621, label: 'Egitto' },
  { from: 625, to: 625, label: 'Giordania' },
  { from: 626, to: 626, label: 'Iran' },
  { from: 628, to: 628, label: 'Arabia Saudita' },
  { from: 629, to: 629, label: 'Emirati Arabi Uniti' },
  { from: 640, to: 649, label: 'Finlandia' },
  { from: 690, to: 699, label: 'Cina' },
  { from: 700, to: 709, label: 'Norvegia' },
  { from: 729, to: 729, label: 'Israele' },
  { from: 730, to: 739, label: 'Svezia' },
  { from: 754, to: 755, label: 'Canada' },
  { from: 759, to: 759, label: 'Venezuela' },
  { from: 760, to: 769, label: 'Svizzera' },
  { from: 770, to: 771, label: 'Colombia' },
  { from: 773, to: 773, label: 'Uruguay' },
  { from: 775, to: 775, label: 'Peru' },
  { from: 777, to: 777, label: 'Bolivia' },
  { from: 778, to: 779, label: 'Argentina' },
  { from: 780, to: 780, label: 'Cile' },
  { from: 784, to: 784, label: 'Paraguay' },
  { from: 786, to: 786, label: 'Ecuador' },
  { from: 789, to: 790, label: 'Brasile' },
  { from: 800, to: 839, label: 'Italia' },
  { from: 840, to: 849, label: 'Spagna' },
  { from: 850, to: 850, label: 'Cuba' },
  { from: 858, to: 858, label: 'Slovacchia' },
  { from: 859, to: 859, label: 'Cechia' },
  { from: 860, to: 860, label: 'Serbia' },
  { from: 865, to: 865, label: 'Mongolia' },
  { from: 867, to: 867, label: 'Corea del Nord' },
  { from: 868, to: 869, label: 'Turchia' },
  { from: 870, to: 879, label: 'Paesi Bassi' },
  { from: 880, to: 881, label: 'Corea del Sud' },
  { from: 884, to: 884, label: 'Cambogia' },
  { from: 885, to: 885, label: 'Thailandia' },
  { from: 888, to: 888, label: 'Singapore' },
  { from: 890, to: 890, label: 'India' },
  { from: 893, to: 893, label: 'Vietnam' },
  { from: 899, to: 899, label: 'Indonesia' },
  { from: 900, to: 919, label: 'Austria' },
  { from: 930, to: 939, label: 'Australia' },
  { from: 940, to: 949, label: 'Nuova Zelanda' },
  { from: 955, to: 955, label: 'Malaysia' },
  { from: 958, to: 958, label: 'Macao' },
  { from: 977, to: 977, label: 'periodici' },
  { from: 978, to: 979, label: 'libri (ISBN)' },
]

/** Restituisce il paese in cui il codice e' stato registrato, se riconoscibile. */
export function gs1Origin(code: string): string | undefined {
  const c = toGtin13(normalizeBarcode(code))
  if (c.length !== 13) return undefined
  const prefix = Number(c.slice(0, 3))
  return RANGES.find((r) => prefix >= r.from && prefix <= r.to)?.label
}

/** Formattazione leggibile: 8 000500 310427 */
export function formatBarcode(code: string): string {
  const c = normalizeBarcode(code)
  if (c.length === 13) return `${c.slice(0, 1)} ${c.slice(1, 7)} ${c.slice(7)}`
  if (c.length === 8) return `${c.slice(0, 4)} ${c.slice(4)}`
  return c
}

/** I candidati da provare in un database, in ordine di probabilita'.
 *  Un UPC-E puo' essere registrato sia nella forma corta sia in quella lunga. */
export function lookupCandidates(raw: string): string[] {
  const c = normalizeBarcode(raw)
  const out = new Set<string>()
  if (!c) return []
  out.add(toGtin13(c))
  if (c.length === 8) {
    out.add(c)
    // Un EAN-8 puo' essere registrato sia com'e' sia riempito di zeri a 13 cifre.
    out.add(c.padStart(13, '0'))
    // Le confezioni piccole usano l'UPC-E, ma il database conosce quasi sempre
    // solo la forma lunga corrispondente.
    const upcA = upcEToUpcA(c)
    if (upcA) out.add(toGtin13(upcA))
  }
  if (c.length === 12) out.add(c)
  return [...out]
}
