/** Nomi degli additivi piu' diffusi sulle etichette italiane.
 *  Serve a non lasciare l'utente davanti a una sigla: "E322" da solo non
 *  dice niente, "E322 - Lecitine (emulsionante)" si'.
 *  Elenco parziale per scelta: meglio poche voci corrette che molte a caso. */

export interface Additivo {
  nome: string
  categoria: string
}

export const ADDITIVI: Record<string, Additivo> = {
  e100: { nome: 'Curcumina', categoria: 'colorante' },
  e101: { nome: 'Riboflavina', categoria: 'colorante' },
  e120: { nome: 'Cocciniglia', categoria: 'colorante' },
  e129: { nome: 'Rosso allura AC', categoria: 'colorante' },
  e131: { nome: 'Blu patinato V', categoria: 'colorante' },
  e133: { nome: 'Blu brillante FCF', categoria: 'colorante' },
  e140: { nome: 'Clorofille', categoria: 'colorante' },
  e141: { nome: 'Complessi rameici delle clorofille', categoria: 'colorante' },
  e150a: { nome: 'Caramello semplice', categoria: 'colorante' },
  e150c: { nome: 'Caramello ammoniacale', categoria: 'colorante' },
  e150d: { nome: 'Caramello solfito-ammoniacale', categoria: 'colorante' },
  e160a: { nome: 'Caroteni', categoria: 'colorante' },
  e160c: { nome: 'Estratto di paprica', categoria: 'colorante' },
  e161b: { nome: 'Luteina', categoria: 'colorante' },
  e162: { nome: 'Rosso barbabietola', categoria: 'colorante' },
  e163: { nome: 'Antociani', categoria: 'colorante' },
  e170: { nome: 'Carbonato di calcio', categoria: 'colorante' },
  e171: { nome: 'Biossido di titanio', categoria: 'colorante' },
  e172: { nome: 'Ossidi di ferro', categoria: 'colorante' },
  e200: { nome: 'Acido sorbico', categoria: 'conservante' },
  e202: { nome: 'Sorbato di potassio', categoria: 'conservante' },
  e211: { nome: 'Benzoato di sodio', categoria: 'conservante' },
  e220: { nome: 'Anidride solforosa', categoria: 'conservante' },
  e223: { nome: 'Metabisolfito di sodio', categoria: 'conservante' },
  e224: { nome: 'Metabisolfito di potassio', categoria: 'conservante' },
  e250: { nome: 'Nitrito di sodio', categoria: 'conservante' },
  e251: { nome: 'Nitrato di sodio', categoria: 'conservante' },
  e252: { nome: 'Nitrato di potassio', categoria: 'conservante' },
  e260: { nome: 'Acido acetico', categoria: 'acidificante' },
  e262: { nome: 'Acetati di sodio', categoria: 'conservante' },
  e270: { nome: 'Acido lattico', categoria: 'acidificante' },
  e280: { nome: 'Acido propionico', categoria: 'conservante' },
  e282: { nome: 'Propionato di calcio', categoria: 'conservante' },
  e290: { nome: 'Anidride carbonica', categoria: 'gas' },
  e296: { nome: 'Acido malico', categoria: 'acidificante' },
  e300: { nome: 'Acido ascorbico (vitamina C)', categoria: 'antiossidante' },
  e301: { nome: 'Ascorbato di sodio', categoria: 'antiossidante' },
  e306: { nome: 'Estratto ricco di tocoferolo', categoria: 'antiossidante' },
  e307: { nome: 'Alfa-tocoferolo', categoria: 'antiossidante' },
  e316: { nome: 'Eritorbato di sodio', categoria: 'antiossidante' },
  e322: { nome: 'Lecitine', categoria: 'emulsionante' },
  e325: { nome: 'Lattato di sodio', categoria: 'regolatore di acidità' },
  e330: { nome: 'Acido citrico', categoria: 'acidificante' },
  e331: { nome: 'Citrati di sodio', categoria: 'regolatore di acidità' },
  e332: { nome: 'Citrati di potassio', categoria: 'regolatore di acidità' },
  e333: { nome: 'Citrati di calcio', categoria: 'regolatore di acidità' },
  e336: { nome: 'Tartrati di potassio', categoria: 'stabilizzante' },
  e338: { nome: 'Acido fosforico', categoria: 'acidificante' },
  e339: { nome: 'Fosfati di sodio', categoria: 'stabilizzante' },
  e340: { nome: 'Fosfati di potassio', categoria: 'stabilizzante' },
  e341: { nome: 'Fosfati di calcio', categoria: 'antiagglomerante' },
  e392: { nome: 'Estratto di rosmarino', categoria: 'antiossidante' },
  e400: { nome: 'Acido alginico', categoria: 'addensante' },
  e401: { nome: 'Alginato di sodio', categoria: 'addensante' },
  e406: { nome: 'Agar agar', categoria: 'gelificante' },
  e407: { nome: 'Carragenina', categoria: 'addensante' },
  e410: { nome: 'Farina di semi di carrube', categoria: 'addensante' },
  e412: { nome: 'Gomma di guar', categoria: 'addensante' },
  e414: { nome: 'Gomma arabica', categoria: 'addensante' },
  e415: { nome: 'Gomma di xanthan', categoria: 'addensante' },
  e418: { nome: 'Gomma gellano', categoria: 'gelificante' },
  e420: { nome: 'Sorbitolo', categoria: 'edulcorante' },
  e421: { nome: 'Mannitolo', categoria: 'edulcorante' },
  e422: { nome: 'Glicerolo', categoria: 'umettante' },
  e440: { nome: 'Pectine', categoria: 'gelificante' },
  e450: { nome: 'Difosfati', categoria: 'lievitante' },
  e451: { nome: 'Trifosfati', categoria: 'stabilizzante' },
  e452: { nome: 'Polifosfati', categoria: 'stabilizzante' },
  e460: { nome: 'Cellulosa', categoria: 'addensante' },
  e461: { nome: 'Metilcellulosa', categoria: 'addensante' },
  e464: { nome: 'Idrossipropilmetilcellulosa', categoria: 'addensante' },
  e466: { nome: 'Carbossimetilcellulosa', categoria: 'addensante' },
  e470b: { nome: 'Sali di magnesio degli acidi grassi', categoria: 'antiagglomerante' },
  e471: { nome: 'Mono e digliceridi degli acidi grassi', categoria: 'emulsionante' },
  e472e: { nome: 'Esteri mono e diacetiltartarici', categoria: 'emulsionante' },
  e476: { nome: 'Poliricinoleato di poliglicerolo', categoria: 'emulsionante' },
  e481: { nome: 'Stearoil-2-lattilato di sodio', categoria: 'emulsionante' },
  e500: { nome: 'Carbonati di sodio', categoria: 'lievitante' },
  e501: { nome: 'Carbonati di potassio', categoria: 'regolatore di acidità' },
  e503: { nome: 'Carbonati di ammonio', categoria: 'lievitante' },
  e504: { nome: 'Carbonati di magnesio', categoria: 'antiagglomerante' },
  e509: { nome: 'Cloruro di calcio', categoria: 'stabilizzante' },
  e516: { nome: 'Solfato di calcio', categoria: 'stabilizzante' },
  e524: { nome: 'Idrossido di sodio', categoria: 'regolatore di acidità' },
  e551: { nome: 'Biossido di silicio', categoria: 'antiagglomerante' },
  e553b: { nome: 'Talco', categoria: 'antiagglomerante' },
  e575: { nome: 'Glucono-delta-lattone', categoria: 'acidificante' },
  e621: { nome: 'Glutammato monosodico', categoria: 'esaltatore di sapidità' },
  e627: { nome: 'Guanilato disodico', categoria: 'esaltatore di sapidità' },
  e631: { nome: 'Inosinato disodico', categoria: 'esaltatore di sapidità' },
  e635: { nome: 'Ribonucleotidi di sodio', categoria: 'esaltatore di sapidità' },
  e900: { nome: 'Dimetilpolisilossano', categoria: 'antischiumogeno' },
  e901: { nome: 'Cera d’api', categoria: 'agente di rivestimento' },
  e903: { nome: 'Cera carnauba', categoria: 'agente di rivestimento' },
  e904: { nome: 'Gommalacca', categoria: 'agente di rivestimento' },
  e920: { nome: 'L-cisteina', categoria: 'agente di trattamento della farina' },
  e950: { nome: 'Acesulfame K', categoria: 'edulcorante' },
  e951: { nome: 'Aspartame', categoria: 'edulcorante' },
  e952: { nome: 'Ciclamati', categoria: 'edulcorante' },
  e954: { nome: 'Saccarina', categoria: 'edulcorante' },
  e955: { nome: 'Sucralosio', categoria: 'edulcorante' },
  e960: { nome: 'Glicosidi steviolici', categoria: 'edulcorante' },
  e965: { nome: 'Maltitolo', categoria: 'edulcorante' },
  e967: { nome: 'Xilitolo', categoria: 'edulcorante' },
  e968: { nome: 'Eritritolo', categoria: 'edulcorante' },
  e1103: { nome: 'Invertasi', categoria: 'enzima' },
  e1105: { nome: 'Lisozima', categoria: 'conservante' },
  e1200: { nome: 'Polidestrosio', categoria: 'addensante' },
  e1400: { nome: 'Destrine', categoria: 'addensante' },
  e1412: { nome: 'Fosfato di diamido', categoria: 'addensante' },
  e1414: { nome: 'Fosfato di diamido acetilato', categoria: 'addensante' },
  e1420: { nome: 'Amido acetilato', categoria: 'addensante' },
  e1442: { nome: 'Fosfato di diamido idrossipropilato', categoria: 'addensante' },
}

/** "en:e322i" -> { sigla: "E322i", nome: "Lecitine", categoria: "emulsionante" }
 *  Se la sigla esatta non c'e' si prova la forma senza suffisso (e322i -> e322):
 *  le sottovarianti hanno quasi sempre lo stesso nome commerciale. */
export function descriviAdditivo(tag: string): { sigla: string; nome?: string; categoria?: string } {
  const key = chiaveAdditivo(tag)
  // Sulle etichette la sigla si scrive con la E maiuscola e il suffisso
  // minuscolo: E322i, non E322I.
  const sigla = 'E' + key.slice(1)
  const trovato = ADDITIVI[key] ?? ADDITIVI[radice(key)]
  return { sigla, nome: trovato?.nome, categoria: trovato?.categoria }
}

function chiaveAdditivo(tag: string): string {
  const raw = tag.includes(':') ? tag.slice(tag.indexOf(':') + 1) : tag
  return raw.toLowerCase().replace(/\s+/g, '')
}

/** "e322i" -> "e322": la sottovariante e il suo capostipite. */
function radice(key: string): string {
  return key.replace(/[a-z]+$/, '')
}

/** Open Food Facts elenca sia il capostipite sia le sue varianti, e la scheda
 *  finiva per mostrare due volte "Lecitine". Qui resta una voce sola: quella
 *  generica quando c'è, altrimenti la variante. */
export function additiviDistinti(tags: string[]): string[] {
  const chiavi = tags.map(chiaveAdditivo)
  const generici = new Set(chiavi.filter((k) => radice(k) === k))
  const visti = new Set<string>()
  const out: string[] = []
  tags.forEach((tag, i) => {
    const k = chiavi[i]
    if (k !== radice(k) && generici.has(radice(k))) return
    if (visti.has(k)) return
    visti.add(k)
    out.push(tag)
  })
  return out
}
