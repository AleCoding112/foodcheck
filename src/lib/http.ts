/** Piccolo strato di rete con tre accorgimenti, tutti motivati da un limite reale:
 *  Open Food Facts limita le chiamate ravvicinate (l'endpoint di ricerca si e'
 *  chiuso dopo poche richieste in fase di verifica).
 *
 *  1. coda: mai piu' di poche richieste in volo insieme
 *  2. deduplica: due schermate che chiedono lo stesso codice fanno una chiamata sola
 *  3. timeout: una richiesta che non risponde non blocca l'interfaccia
 */

export type ApiErrorKind = 'offline' | 'timeout' | 'http' | 'parse' | 'annullata'

export class ApiError extends Error {
  kind: ApiErrorKind
  status?: number
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

const MAX_IN_VOLO = 3
const PAUSA_MINIMA_MS = 70

let inVolo = 0
let ultimaPartenza = 0
const attesa: Array<() => void> = []

function libera() {
  inVolo--
  const prossima = attesa.shift()
  if (prossima) prossima()
}

function prenota(): Promise<void> {
  return new Promise((resolve) => {
    const parti = () => {
      inVolo++
      const ora = Date.now()
      const ritardo = Math.max(0, ultimaPartenza + PAUSA_MINIMA_MS - ora)
      ultimaPartenza = ora + ritardo
      setTimeout(resolve, ritardo)
    }
    if (inVolo < MAX_IN_VOLO) parti()
    else attesa.push(parti)
  })
}

const condivise = new Map<string, Promise<unknown>>()

export interface GetOptions {
  timeoutMs?: number
  /** 404 e' una risposta legittima ("questo prodotto non esiste"), non un errore. */
  accettaNonTrovato?: boolean
}

async function esegui<T>(url: string, opt: GetOptions): Promise<T | null> {
  const timeoutMs = opt.timeoutMs ?? 9000
  await prenota()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort('timeout'), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      // Nessun cookie e nessuna credenziale: all'API non serve sapere chi siamo.
      credentials: 'omit',
      mode: 'cors',
    })
    if (res.status === 404 && opt.accettaNonTrovato) return null
    if (!res.ok) throw new ApiError('http', `Risposta ${res.status} da ${new URL(url).host}`, res.status)
    try {
      return (await res.json()) as T
    } catch {
      throw new ApiError('parse', 'La risposta non era in formato leggibile.')
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (ctrl.signal.aborted) throw new ApiError('timeout', 'Il server non ha risposto in tempo.')
    throw new ApiError('offline', 'Non riesco a raggiungere il server.')
  } finally {
    clearTimeout(timer)
    libera()
  }
}

/** Scarica JSON. Restituisce null quando la risorsa non esiste e
 *  `accettaNonTrovato` e' attivo. */
export function getJson<T>(url: string, opt: GetOptions = {}): Promise<T | null> {
  const esistente = condivise.get(url)
  if (esistente) return esistente as Promise<T | null>
  const p = esegui<T>(url, opt).finally(() => {
    condivise.delete(url)
  })
  condivise.set(url, p)
  return p
}

export function siamoOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
