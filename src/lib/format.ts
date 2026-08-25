/** Formattazioni condivise. Regola generale: se un valore manca non si scrive
 *  zero e non si scrive un trattino muto, si dice che non c'è. */

export function numero(v: number | undefined, unita: string, decimali = 1): string | undefined {
  if (v === undefined) return undefined
  const arrotondato = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(decimali))
  return `${arrotondato.toLocaleString('it-IT')} ${unita}`
}

export function energia(kcal: number | undefined): string | undefined {
  if (kcal === undefined) return undefined
  return `${Math.round(kcal).toLocaleString('it-IT')} kcal`
}

const GIORNO = 24 * 60 * 60 * 1000

export function quando(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'adesso'
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} min fa`
  if (diff < GIORNO) return `${Math.floor(diff / (60 * 60_000))} h fa`
  if (diff < 2 * GIORNO) return 'ieri'
  if (diff < 7 * GIORNO) return `${Math.floor(diff / GIORNO)} giorni fa`
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}
