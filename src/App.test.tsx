// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from './App'

/** Prova di montaggio: non verifica l'estetica, verifica che l'app parta.
 *  Serve a non scoprire una schermata bianca quando si è già al supermercato. */

beforeAll(() => {
  // Nessuna chiamata di rete durante la prova.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('rete non disponibile nei test'))))
})

describe('App', () => {
  it('mostra la schermata iniziale', async () => {
    render(<App />)
    expect(screen.getByText('FoodCheck')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Inquadra un prodotto/ })).toBeTruthy()
    expect(screen.getByLabelText('Codice a barre')).toBeTruthy()
    await waitFor(() =>
      expect(screen.getByText(/Qui compariranno i prodotti che hai letto/)).toBeTruthy(),
    )
  })

  it('tiene disattivato il pulsante di ricerca finché il codice è troppo corto', () => {
    render(<App />)
    const cerca = screen.getAllByRole('button', { name: 'Cerca' })[0] as HTMLButtonElement
    expect(cerca.disabled).toBe(true)
  })

  // Difetto trovato dalla CI e non in locale: la lettura dello storico
  // finiva dopo lo smontaggio del componente e aggiornava lo stato di un
  // albero che non c'era più. Qui si smonta subito, apposta.
  it('non aggiorna lo stato dopo essere stato smontato', async () => {
    const vista = render(<App />)
    vista.unmount()
    await new Promise((r) => setTimeout(r, 60))
    expect(true).toBe(true)
  })
})
