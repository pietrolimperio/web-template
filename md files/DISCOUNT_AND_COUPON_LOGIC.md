# Logica Coupon e Sconti Automatici

Questo documento descrive il funzionamento di coupon e sconti automatici nel frontend, l’integrazione con il backend Leaz e le regole di business applicate.

---

## Indice

1. [Panoramica](#panoramica)
2. [Unità monetarie](#unità-monetarie)
3. [Order total (importo ordine)](#order-total-importo-ordine)
4. [Sconti automatici](#sconti-automatici)
5. [Coupon](#coupon)
6. [Flusso fetch a due fasi](#flusso-fetch-a-due-fasi)
7. [Messaggi di errore (reasonCode)](#messaggi-di-errore-reasoncode)
8. [Registrazione utilizzo dopo ordine](#registrazione-utilizzo-dopo-ordine)
9. [File e moduli coinvolti](#file-e-moduli-coinvolti)

---

## Panoramica

Il sistema supporta due tipi di sconti promozionali:

- **Sconti automatici**: applicati dal backend in base al listing e all’importo dell’ordine (`min_order_value`). L’utente non inserisce codici.
- **Coupon**: codici inseriti dall’utente e validati tramite API. Possono avere `min_order_value` e regole di compatibilità con gli sconti automatici.

Entrambi possono avere:
- **Tipo percentuale**: sconto espresso in % (es. 10%)
- **Tipo valore fisso**: sconto in minor units (es. 1500 = €15,00)
- **min_order_value** (opzionale o obbligatorio): importo minimo dell’ordine perché lo sconto sia valido

---

## Unità monetarie

Tutti gli importi verso le API sono in **minor units** (centesimi per EUR):

| Importo | Minor units |
|---------|-------------|
| € 15,00 | 1500        |
| € 25,50 | 2550        |
| € 50,00 | 5000        |
| € 100,00| 10000       |

---

## Order total (importo ordine)

L’`orderTotal` è l’importo dell’ordine **senza** sconti promozionali applicati. Serve per:

1. Validare i coupon (controllo `min_order_value`)
2. Filtrare gli sconti automatici applicabili

### Calcolo

La funzione `getOrderTotalInMinorUnits` in `src/util/currency.js`:

1. Filtra i line items con `includeFor` che include `'customer'`
2. Esclude i line items di sconto: `line-item/coupon-discount` e `line-item/auto-discount`
3. Somma i `lineTotal.amount` (già in minor units) degli item rimanenti

Quindi vengono considerati:
- Prezzo base (es. `line-item/day`)
- Spese aggiuntive (spedizione, assicurazione, ecc.)
- Commissione cliente

Non vengono considerati:
- Sconto coupon
- Sconto automatico

---

## Sconti automatici

### API: `POST /api/services/discounts/match`

**Request:**
```json
{
  "listingId": "uuid-del-listing",
  "locale": "it",
  "orderTotal": 2500
}
```

- `orderTotal` opzionale: se presente, il backend restituisce solo sconti con `min_order_value <= orderTotal`.
- Se omesso o assente, il backend può restituire tutti gli sconti per il listing.

**Response:**
```json
{
  "discounts": [
    {
      "id": "uuid",
      "name": "Sconto estate",
      "type": "percentage",
      "value": 15,
      "minOrderValue": 2000
    }
  ]
}
```

### Quando vengono caricati

Gli sconti vengono caricati **solo** nel flusso di fetch dei line items (due fasi), quando l’utente seleziona date. Non vengono più caricati al caricamento iniziale della pagina.

### Scelta dello sconto migliore

- Se ci sono più sconti, il frontend mostra il migliore; il backend/server applica effettivamente il migliore.
- Criteri: preferenza per tipo `percentage`, poi per valore maggiore (`value` più alto).

---

## Coupon

### API: `POST /api/services/coupons/validate`

**Request:**
```json
{
  "code": "SAVE10",
  "listingId": "uuid-del-listing",
  "locale": "it",
  "orderTotal": 2500
}
```

- `orderTotal` opzionale: se presente, il backend controlla `min_order_value`. Se l’ordine è sotto il minimo, la validazione fallisce.

**Response valida:**
```json
{
  "valid": true,
  "type": "percentage",
  "value": 10,
  "minOrderValue": 1500
}
```

**Response non valida (min order non raggiunto):**
```json
{
  "valid": false,
  "reasonCode": "MIN_ORDER_NOT_MET",
  "reason": "Order total must be at least € 15.00",
  "minOrderValue": 1500
}
```

**Response non valida (sconto già attivo):**
```json
{
  "valid": false,
  "reasonCode": "DISCOUNT_ALREADY_ACTIVE",
  "reason": "This coupon cannot be used when a discount is already active on this listing"
}
```

### Chi decide la compatibilità

La compatibilità coupon + sconto automatico è decisa dal **backend**. Il frontend non blocca l’uso del coupon in base agli sconti attivi: invia sempre la richiesta di validazione e mostra il messaggio restituito dal backend.

### Flusso di applicazione

1. L’utente inserisce il codice coupon e clicca su “Applica”.
2. Se ci sono line items (date selezionate), viene calcolato `orderTotal` e inviato alla validate.
3. Se la risposta è `valid: true`, si salva `couponData` e si ricalcolano i line items con il coupon.
4. Se `valid: false`, si mostra un messaggio basato su `reasonCode` (vedi sotto).

---

## Flusso fetch a due fasi

Per rispettare i `min_order_value` degli sconti, i line items vengono recuperati in due fasi.

### Fase 1: line items senza sconti automatici

1. Si invia a `transactionLineItems` un `orderData` **senza** `autoDiscounts`.
2. Si ottengono line items “grezzi” (base + fee + commissioni).
3. Si calcola `orderTotal` con `getOrderTotalInMinorUnits`.
4. Si chiama `fetchAutoDiscounts(listingId, locale, orderTotal)`.

### Fase 2: line items con sconti filtrati

1. Il backend Leaz (`matchDiscounts`) restituisce solo sconti con `min_order_value <= orderTotal`.
2. Lo stato Redux aggiorna `autoDiscounts` con questa lista filtrata.
3. Si invia una **seconda** richiesta a `transactionLineItems` con `autoDiscounts` popolato.
4. I line items finali includono lo sconto automatico (se applicabile).

### Caso senza sconti

- Se `orderTotal` è `undefined`: nessuno sconto applicato, si usano i line items della Fase 1.
- Se l’API Leaz non è disponibile: nessuno sconto applicato.
- Se `filteredDiscounts` è vuoto: nessuno sconto applicato.

### Dove avviene

La logica è in `fetchTransactionLineItems` in `src/containers/ListingPage/ListingPage.duck.js`.

---

## Messaggi di errore (reasonCode)

Per la validazione dei coupon, il frontend usa `reasonCode` per scegliere il messaggio locale.

| reasonCode              | Chiave traduzione                         | Contesto                                   |
|-------------------------|-------------------------------------------|--------------------------------------------|
| `DISCOUNT_ALREADY_ACTIVE` | `ProductPage.couponReasonDiscountAlreadyActive` | Coupon non compatibile con sconto attivo  |
| `MIN_ORDER_NOT_MET`     | `ProductPage.couponReasonMinOrderNotMet`  | Importo minimo ordine non raggiunto       |
| Altro o mancante        | `result.reason` o messaggio generico      | Fallback                                  |

Per `MIN_ORDER_NOT_MET` si usa `minOrderValue` dalla risposta per formattare l’importo (es. “L’ordine deve avere un importo minimo di € 15,00”).

**Nota:** messaggi di errore sono mostrati solo per i tentativi di applicazione di **coupon**. Gli sconti automatici non applicabili (es. per `min_order_value`) restano semplicemente esclusi dalla lista e non generano messaggi.

---

## Registrazione utilizzo dopo ordine

Dopo che un ordine è completato, è necessario registrare l’utilizzo di coupon e sconti:

### API

- **Coupon:** `POST /api/services/coupons/{couponId}/use`
- **Sconto automatico:** `POST /api/services/discounts/{discountId}/use`

### Funzione helper

`registerAllUsage` in `src/util/leazBackendApi.js` effettua le chiamate per tutti i coupon e sconti applicati, ignorando eventuali 409 (già registrati).

---

## File e moduli coinvolti

| File | Ruolo |
|------|-------|
| `src/util/leazBackendApi.js` | API client: `validateCoupon`, `matchDiscounts`, `registerCouponUsage`, `registerDiscountUsage`, `registerAllUsage` |
| `src/util/currency.js` | `getOrderTotalInMinorUnits` |
| `src/containers/ListingPage/ListingPage.duck.js` | Fetch a due fasi, `fetchAutoDiscounts`, `fetchTransactionLineItems` |
| `src/containers/ProductPage/ProductPage.js` | UI coupon, `handleApplyCoupon`, gestione `reasonCode` |
| `server/api-util/lineItemHelpers.js` | `getAutoDiscountMaybe`: applica il miglior sconto automatico sui line items |
| `server/api-util/lineItems.js` | Costruzione line items con sconti |
| `src/components/OrderBreakdown/LineItemCouponDiscountMaybe.js` | Visualizzazione sconto coupon nel riepilogo |
| `src/components/OrderBreakdown/LineItemAutoDiscountMaybe.js` | Visualizzazione sconto automatico nel riepilogo |

---

## Configurazione

Per abilitare coupon e sconti è necessario che l’API Leaz sia configurata:

- `REACT_APP_LEAZ_BACKEND_API_URL`
- `REACT_APP_LEAZ_BACKEND_API_KEY`

La disponibilità è verificata tramite `isLeazBackendApiAvailable()` (controlla che `BASE_URL` sia definito).
