# FoodCheck

Scansiona un codice a barre, sappi cosa stai per mangiare.

Applicazione web installabile (PWA) che legge il codice a barre di un prodotto
alimentare e mostra ingredienti, allergeni dichiarati, valori nutrizionali,
additivi, Nutri-Score e gruppo NOVA. Nessun account, nessun server: i dati
dell'utente restano sul dispositivo.

I dati sui prodotti arrivano da [Open Food Facts](https://world.openfoodfacts.org)
e dai progetti collegati, distribuiti con licenza ODbL.

## Stato

Fase 1 completata: scanner funzionante e scheda prodotto.

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 0 | Impianto del progetto, PWA, deploy automatico | fatto |
| 1 | Scanner, catena di ricerca, scheda prodotto | fatto |
| 2 | Profilo allergie e diete, semaforo | da fare |
| 3 | Dispensa e scadenze | da fare |
| 4 | Inserimento manuale dei prodotti mancanti | da fare |
| 5 | Rifinitura, esportazione dati, rilascio | da fare |

Il piano completo è in [`docs/piano.html`](docs/piano.html).

## Come si avvia

```bash
npm install
npm run dev          # http://localhost:5173
```

### Provare dal telefono

La fotocamera funziona solo in **contesto sicuro**: `localhost` va bene, un
indirizzo `http://192.168.x.x` no. Due strade:

```bash
npm run dev:https    # certificato autofirmato, poi apri https://<ip-del-mac>:5173
```

Il telefono mostrerà un avviso sul certificato: va accettato una volta.
In alternativa, pubblica su GitHub Pages (vedi sotto) e usa l'indirizzo vero.

### Prove automatiche

```bash
npm test                      # logica pura e montaggio dell'interfaccia
FOODCHECK_LIVE=1 npm test     # aggiunge le chiamate reali all'API
```

## Come è fatto

```
src/
  lib/barcode.ts            validazione GTIN, origine GS1, codici interni del negozio
  lib/http.ts               coda, deduplica e timeout sulle chiamate
  lib/db.ts                 IndexedDB: cache prodotti, storico, profili, dispensa
  lib/sources/              catena di ricerca sui quattro database aperti
  lib/dictionaries/         allergeni, etichette e additivi in italiano
  hooks/useScanner.ts       fotocamera e decodifica del codice
  components/               scanner a schermo intero e scheda prodotto
```

Tre scelte che vale la pena conoscere prima di metterci mano.

**La lettura del codice usa due motori.** Dove esiste, si usa il decodificatore
di sistema del browser (`BarcodeDetector`): è veloce e non pesa nulla. Dove non
c'è — in pratica su iPhone — si scarica ZXing, mezzo megabyte di JavaScript,
solo in quel momento e solo su quei dispositivi. Per lo stesso motivo il
service worker non lo precarica.

**Un codice viene accettato solo se letto due volte uguale e se supera la cifra
di controllo.** Costa qualche decimo di secondo e evita di aprire la scheda del
prodotto sbagliato, che a scaffale capita più spesso di quanto sembri.

**La cache dei prodotti sta in IndexedDB, non nel service worker.** Così l'app
sa sempre quanto è vecchio un dato e può scriverlo a schermo, invece di far
finta che sia aggiornato.

## Quando il dato non c'è

Circa sei prodotti italiani su dieci nel database non hanno il Nutri-Score, e
molti non hanno nemmeno gli ingredienti. L'app lo dice invece di stimare:
"non disponibile" è una risposta, un valore inventato no. La stessa regola varrà,
molto più seriamente, per il semaforo allergeni della fase 2: senza ingredienti
completi non si arriva mai a un via libera.

## Pubblicazione

Il workflow in `.github/workflows/deploy.yml` costruisce e pubblica su GitHub
Pages a ogni push su `main`. Va abilitato una volta sola:
*Settings → Pages → Source: GitHub Actions*.

## Licenza

Codice: MIT (vedi [LICENSE](LICENSE)).
Dati dei prodotti: ODbL, di Open Food Facts e dei suoi contributori — gli
obblighi di attribuzione sono spiegati in [NOTICE.md](NOTICE.md).

FoodCheck riporta quello che il database contiene. Per allergie e intolleranze
fa fede l'etichetta sulla confezione. Non è un dispositivo medico.
