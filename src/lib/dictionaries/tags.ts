/** Traduzione delle etichette di Open Food Facts, che arrivano nella forma
 *  "en:milk" oppure "it:latte". Quando non conosciamo un'etichetta la
 *  ripuliamo invece di nasconderla: meglio "Farina di riso" scritto male
 *  che un dato sparito dalla schermata. */

/** I 14 allergeni a dichiarazione obbligatoria nell'Unione Europea. */
export const ALLERGENI: Record<string, string> = {
  gluten: 'Glutine',
  crustaceans: 'Crostacei',
  eggs: 'Uova',
  fish: 'Pesce',
  peanuts: 'Arachidi',
  soybeans: 'Soia',
  milk: 'Latte',
  nuts: 'Frutta a guscio',
  'tree-nuts': 'Frutta a guscio',
  celery: 'Sedano',
  mustard: 'Senape',
  'sesame-seeds': 'Sesamo',
  sesame: 'Sesamo',
  'sulphur-dioxide-and-sulphites': 'Solfiti',
  sulphites: 'Solfiti',
  lupin: 'Lupini',
  molluscs: 'Molluschi',
}

export const ETICHETTE: Record<string, string> = {
  organic: 'Biologico',
  'eu-organic': 'Biologico UE',
  'no-gluten': 'Senza glutine',
  'gluten-free': 'Senza glutine',
  'no-lactose': 'Senza lattosio',
  'lactose-free': 'Senza lattosio',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  'palm-oil-free': 'Senza olio di palma',
  'no-preservatives': 'Senza conservanti',
  'no-added-sugar': 'Senza zuccheri aggiunti',
  'sugar-free': 'Senza zuccheri',
  'fair-trade': 'Commercio equo',
  'pdo': 'DOP',
  'protected-designation-of-origin': 'DOP',
  'pgi': 'IGP',
  'protected-geographical-indication': 'IGP',
  'made-in-italy': 'Prodotto in Italia',
  halal: 'Halal',
  kosher: 'Kosher',
  'green-dot': 'Punto verde',
  'nutriscore': 'Nutri-Score in etichetta',
}

/** Etichette che Open Food Facts deduce leggendo gli ingredienti.
 *  `certezza` distingue un dato accertato da una deduzione automatica:
 *  la differenza conta e va mostrata. */
export const ANALISI: Record<string, { testo: string; tono: 'ok' | 'warn' | 'neutro' }> = {
  'en:vegan': { testo: 'Vegano', tono: 'ok' },
  'en:non-vegan': { testo: 'Non vegano', tono: 'neutro' },
  'en:maybe-vegan': { testo: 'Forse vegano', tono: 'neutro' },
  'en:vegetarian': { testo: 'Vegetariano', tono: 'ok' },
  'en:non-vegetarian': { testo: 'Non vegetariano', tono: 'neutro' },
  'en:maybe-vegetarian': { testo: 'Forse vegetariano', tono: 'neutro' },
  'en:palm-oil': { testo: 'Contiene olio di palma', tono: 'warn' },
  'en:palm-oil-free': { testo: 'Senza olio di palma', tono: 'ok' },
  'en:may-contain-palm-oil': { testo: 'Forse olio di palma', tono: 'warn' },
}

const NOVA: Record<number, { titolo: string; spiega: string }> = {
  1: { titolo: 'Non processato', spiega: 'Alimento tal quale o con lavorazioni minime.' },
  2: { titolo: 'Ingrediente da cucina', spiega: 'Oli, burro, zucchero, sale: si usano per cucinare, non si mangiano da soli.' },
  3: { titolo: 'Processato', spiega: 'Alimento semplice con aggiunta di sale, zucchero o olio.' },
  4: { titolo: 'Ultra-processato', spiega: 'Formulazione industriale con ingredienti che in cucina non si usano.' },
}

export function novaInfo(group: number) {
  return NOVA[group]
}

const NUTRI: Record<string, string> = {
  a: 'Qualità nutrizionale alta',
  b: 'Qualità nutrizionale buona',
  c: 'Qualità nutrizionale media',
  d: 'Qualità nutrizionale bassa',
  e: 'Qualità nutrizionale molto bassa',
}

export function nutriScoreInfo(grade: string) {
  return NUTRI[grade.toLowerCase()]
}

/** Toglie il prefisso di lingua da un tag ("en:milk" -> "milk"). */
export function stripLang(tag: string): string {
  const i = tag.indexOf(':')
  return i === -1 ? tag : tag.slice(i + 1)
}

function ripulisci(tag: string): string {
  const base = stripLang(tag).replace(/-/g, ' ').trim()
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function traduciAllergene(tag: string): string {
  return ALLERGENI[stripLang(tag)] ?? ripulisci(tag)
}

export function traduciEtichetta(tag: string): string {
  return ETICHETTE[stripLang(tag)] ?? ripulisci(tag)
}
