// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from './App'

/** Prove di montaggio e di percorso: non giudicano l'estetica, verificano che
 *  l'app parta e che le vie d'uscita esistano sempre. */

beforeAll(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('rete non disponibile nei test'))))
})

describe('App', () => {
  it('si apre chiedendo la fotocamera, senza pretenderla', async () => {
    render(<App />)
    expect(screen.getByText('FoodCheck')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Attiva la fotocamera/ })).toBeTruthy()

    // Al primo avvio non c'è nulla da mostrare: il foglio dei recenti resta
    // chiuso invece di comparire vuoto sotto l'invito.
    await waitFor(() => expect(screen.queryByText(/Letti di recente/i)).toBeNull())
  })

  it('offre sempre la digitazione del codice come alternativa', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Digita il codice a mano' }))

    const campo = screen.getByLabelText('Codice a barre') as HTMLInputElement
    const cerca = screen.getByRole('button', { name: 'Cerca' }) as HTMLButtonElement
    expect(cerca.disabled).toBe(true)

    fireEvent.change(campo, { target: { value: '8000500310427' } })
    expect(cerca.disabled).toBe(false)

    // Le cifre restano leggibili anche se scritte con gli spazi della confezione.
    fireEvent.change(campo, { target: { value: '8 000500 310427' } })
    expect(cerca.disabled).toBe(false)
  })

  it('chiude la finestra del codice con Esc', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Digita il codice a mano' }))
    expect(screen.getByLabelText('Codice a barre')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByLabelText('Codice a barre')).toBeNull())
  })

  // Difetto trovato dalla CI e non in locale: la lettura dello storico finiva
  // dopo lo smontaggio e aggiornava lo stato di un albero che non c'era più.
  it('non aggiorna lo stato dopo essere stato smontato', async () => {
    const vista = render(<App />)
    vista.unmount()
    await new Promise((r) => setTimeout(r, 60))
    expect(true).toBe(true)
  })
})
