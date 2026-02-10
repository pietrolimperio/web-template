# Instant Booking Transaction Process — Documentazione completa

## Indice

1. [Panoramica](#1-panoramica)
2. [Confronto con default-booking](#2-confronto-con-default-booking)
3. [Diagramma degli stati](#3-diagramma-degli-stati)
4. [Transizioni e attori](#4-transizioni-e-attori)
5. [Timing e scadenze](#5-timing-e-scadenze)
6. [Casi d'uso dettagliati](#6-casi-duso-dettagliati)
7. [Email e notifiche](#7-email-e-notifiche)
8. [Stati finali e rimborsi](#8-stati-finali-e-rimborsi)

---

## 1. Panoramica

Il processo **instant-booking** è un transaction process per prenotazioni **istantanee**: il pagamento viene confermato e incassato subito, senza passaggio per l’accettazione del provider.

### Caratteristiche principali

| Aspetto | Descrizione |
|---------|-------------|
| **Tipo** | Booking con conferma immediata |
| **Provider** | Nessuna azione richiesta (accettare/rifiutare) |
| **Pagamento** | Catturato al momento della conferma del pagamento |
| **Payout** | `booking-end` + 4 giorni (come default-booking) |
| **Recensioni** | Periodo 14 giorni (blind reviews) |
| **Unit types** | day, night, hour, fixed |

### Quando usarlo

- Listings di **aziende** che non richiedono approvazione manuale
- Prodotti/servizi sempre disponibili
- Flusso di prenotazione simile a un e-commerce

---

## 2. Confronto con default-booking

| Fase | default-booking | instant-booking |
|------|-----------------|-----------------|
| **Dopo confirm-payment** | Stato `preauthorized` → provider deve accettare | Stato `booked` → booking confermato subito |
| **Pagamento** | Addebitato solo dopo accept | Addebitato subito con confirm-payment |
| **Provider** | Deve accettare entro 6 giorni o 2 giorni prima di booking-start | Nessuna azione richiesta |
| **Payout** | `booking-end` + 4 giorni | `booking-end` + 4 giorni |
| **Email dopo conferma** | booking-new-request (provider), booking-accepted-request (customer) | booking-confirmed-customer, booking-confirmed-provider |
| **Stati intermediate** | preauthorized, accepted, declined, expired | Nessuno |

---

## 3. Diagramma degli stati

```
                                    ┌─────────────────┐
                                    │    initial      │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │ inquire                │ request-payment        │
                    ▼                        ▼                        │
            ┌───────────────┐        ┌───────────────────┐          │
            │   inquiry     │        │  pending-payment   │          │
            └───────┬───────┘        └─────────┬──────────┘          │
                    │ request-payment-after-  │                       │
                    │ inquiry                 │                       │
                    └────────────────────────┘                       │
                             │                    │                   │
                             │                    │ expire-payment    │
                             │                    │ (15 min)          │
                             │                    ▼                   │
                             │            ┌───────────────────┐       │
                             │            │  payment-expired  │       │
                             │            └───────────────────┘       │
                             │                    │                   │
                             │                    │ confirm-payment   │
                             │                    ▼                   │
                             │            ┌───────────────────┐       │
                             │            │      booked       │       │
                             │            └─────────┬────────┘       │
                             │                      │                 │
                             │                      │ complete        │
                             │                      │ (at booking-end │
                             │                      │  + 4 giorni)    │
                             │                      ▼                 │
                             │            ┌───────────────────┐       │
                             │            │    delivered      │       │
                             │            └─────────┬────────┘       │
                             │                      │                 │
                             │         ┌────────────┼────────────┐   │
                             │         │            │            │   │
                             │   review-1-by-  review-1-by-  expire- │
                             │   provider      customer    review-  │
                             │         │            │      period    │
                             │         │            │      (14D)     │
                             │         ▼            ▼            │   │
                             │  ┌──────────────┐ ┌──────────────┐│   │
                             │  │reviewed-by-  │ │reviewed-by-  ││   │
                             │  │  provider    │ │  customer    │   │
                             │  └──────┬───────┘ └──────┬───────┘   │
                             │         │                 │           │
                             │         │ review-2-by-    │ review-2-by│
                             │         │ provider        │ customer  │
                             │         │   (or expire)   │ (or expire)│
                             │         └────────┬────────┘           │
                             │                  ▼                    │
                             │         ┌───────────────────┐         │
                             │         │     reviewed      │         │
                             │         └───────────────────┘         │
                             │                                        │
                             │         booked ──cancel──► cancelled    │
                             └────────────────────────────────────────┘
```

---

## 4. Transizioni e attori

### Tabella completa delle transizioni

| Transizione | Attore | Da stato | A stato | Privileged? | Note |
|-------------|--------|----------|---------|-------------|------|
| `transition/inquire` | customer | initial | inquiry | No | Contatto iniziale senza pagamento |
| `transition/request-payment` | customer | initial | pending-payment | Sì | Crea PaymentIntent, va via backend |
| `transition/request-payment-after-inquiry` | customer | inquiry | pending-payment | Sì | Stesso comportamento da inquiry |
| `transition/expire-payment` | system | pending-payment | payment-expired | — | Automatico dopo 15 minuti |
| `transition/confirm-payment` | customer | pending-payment | booked | No | Accetta booking + conferma + cattura pagamento |
| `transition/complete` | system | booked | delivered | — | Automatico a booking-end + 4 giorni |
| `transition/cancel` | operator | booked | cancelled | — | Solo operatore |
| `transition/review-1-by-provider` | provider | delivered | reviewed-by-provider | No | Prima recensione |
| `transition/review-2-by-provider` | provider | reviewed-by-customer | reviewed | No | Seconda recensione |
| `transition/review-1-by-customer` | customer | delivered | reviewed-by-customer | No | Prima recensione |
| `transition/review-2-by-customer` | customer | reviewed-by-provider | reviewed | No | Seconda recensione |
| `transition/expire-review-period` | system | delivered | reviewed | — | Se nessuno recensisce in 14 giorni |
| `transition/expire-provider-review-period` | system | reviewed-by-customer | reviewed | — | Provider non recensisce in 14 giorni |
| `transition/expire-customer-review-period` | system | reviewed-by-provider | reviewed | — | Customer non recensisce in 14 giorni |

### Stati del processo

| Stato | Descrizione |
|-------|-------------|
| `initial` | Transazione appena creata |
| `inquiry` | Customer ha inviato un messaggio, senza richiesta di pagamento |
| `pending-payment` | Customer ha richiesto il pagamento, PaymentIntent creato |
| `payment-expired` | Nessuna conferma pagamento entro 15 minuti |
| `booked` | Prenotazione confermata e pagamento incassato |
| `cancelled` | Prenotazione annullata (solo operatore) |
| `delivered` | Periodo di noleggio terminato, payout inviato |
| `reviewed-by-provider` | Provider ha recensito per primo |
| `reviewed-by-customer` | Customer ha recensito per primo |
| `reviewed` | Entrambe le recensioni pubblicate o periodo scaduto |

---

## 5. Timing e scadenze

### Riepilogo temporale

| Evento | Tempo | Parametro |
|--------|-------|-----------|
| Scadenza pagamento | 15 minuti | `PT15M` dal primo ingresso in `pending-payment` |
| Complete (payout) | 4 giorni dopo la fine del noleggio | `booking-end` + P4D |
| Periodo recensioni | 14 giorni | `P14D` da `booking-end` |
| Scadenza recensioni | 14 giorni | `P14D` da `booking-end` |

### Dettaglio formule temporali

#### 1. Scadenza pagamento (`expire-payment`)

```
at = first-entered-state(pending-payment) + 15 minuti
```

- **Quando**: 15 minuti dopo l’ingresso in `pending-payment`
- **Effetto**: Rimborso automatico, transizione in `payment-expired`
- **Riferimento**: `[:time/first-entered-state :state/pending-payment]`

#### 2. Complete (`complete`)

```
at = booking-end + 4 giorni
```

- **Quando**: 4 giorni dopo la fine del periodo di noleggio (`booking.end`)
- **Effetto**: Creazione payout per il provider, transizione in `delivered`
- **Nota**: Stesso timing di `default-booking` per il payout

#### 3. Scadenza periodo recensioni (`expire-review-period`)

```
at = booking-end + 14 giorni
```

- **Quando**: 14 giorni dopo la fine del noleggio
- **Da**: `delivered` (se nessuno ha ancora recensito)
- **Effetto**: Transizione in `reviewed` senza pubblicare recensioni

#### 4. Scadenza recensione provider (`expire-provider-review-period`)

```
at = booking-end + 14 giorni
```

- **Quando**: 14 giorni dopo la fine del noleggio
- **Da**: `reviewed-by-customer` (customer ha recensito, provider no)
- **Effetto**: Pubblicazione della recensione del customer, transizione in `reviewed`

#### 5. Scadenza recensione customer (`expire-customer-review-period`)

```
at = booking-end + 14 giorni
```

- **Quando**: 14 giorni dopo la fine del noleggio
- **Da**: `reviewed-by-provider` (provider ha recensito, customer no)
- **Effetto**: Pubblicazione della recensione del provider, transizione in `reviewed`

---

## 6. Casi d'uso dettagliati

### Caso 1: Prenotazione diretta (senza inquiry)

1. **Customer** sceglie date e prezzo su listing con `instant-booking`
2. **Customer** clicca “Prenota” → `transition/request-payment` (privileged, via backend)
3. Sistema crea PaymentIntent Stripe, transizione in `pending-payment`
4. **Customer** completa il pagamento su Stripe (card, 3DS se richiesto)
5. **Customer** conferma → `transition/confirm-payment`
6. Sistema: `accept-booking`, `stripe-confirm-payment-intent`, `stripe-capture-payment-intent`
7. Transizione in `booked`
8. Email a **customer** (booking-confirmed-customer) e **provider** (booking-confirmed-provider)
9. A `booking-end` + 4 giorni: `transition/complete` automatico
10. Sistema crea payout per provider, transizione in `delivered`
11. Email a **provider** (booking-money-paid, booking-review-by-provider-wanted)
12. Email a **customer** (booking-review-by-customer-wanted)
13. Recensioni: chi recensisce per primo determina lo stato successivo; dopo 14 giorni da `booking-end` scatta l’expire se manca una recensione

### Caso 2: Prenotazione con inquiry precedente

1. **Customer** invia messaggio → `transition/inquire` (stato `inquiry`)
2. **Customer** e **provider** si scambiano messaggi
3. **Customer** richiede pagamento → `transition/request-payment-after-inquiry` (privileged)
4. Stesso flusso del Caso 1 da `pending-payment` in poi

### Caso 3: Pagamento non confermato in tempo

1. **Customer** richiede pagamento → `pending-payment`
2. **Customer** non completa il pagamento entro 15 minuti
3. Sistema esegue `transition/expire-payment`
4. Rimborso full, transizione in `payment-expired`
5. Nessuna email aggiuntiva (non c’è notifica per payment-expired nel processo)

### Caso 4: Annullamento da operatore

1. Transazione in `booked`
2. **Operatore** esegue `transition/cancel`
3. Rimborso completo, transizione in `cancelled`
4. Nessuna email specifica per cancel (solo comportamento descritto in process)

### Caso 5: Recensioni – customer recensisce per primo

1. Transazione in `delivered`
2. **Customer** recensisce → `transition/review-1-by-customer` → `reviewed-by-customer`
3. **Provider** riceve email (booking-review-by-other-party-unpublished)
4. **Provider** recensisce → `transition/review-2-by-provider` → `reviewed`
5. **Customer** riceve email (booking-review-by-other-party-published)
6. Fine percorso

### Caso 6: Recensioni – provider recensisce per primo

1. Transazione in `delivered`
2. **Provider** recensisce → `transition/review-1-by-provider` → `reviewed-by-provider`
3. **Customer** riceve email (booking-review-by-other-party-unpublished)
4. **Customer** recensisce → `transition/review-2-by-customer` → `reviewed`
5. **Provider** riceve email (booking-review-by-other-party-published)
6. Fine percorso

### Caso 7: Nessuna recensione

1. Transazione in `delivered`
2. Nessuno recensisce entro 14 giorni da `booking-end`
3. Sistema esegue `transition/expire-review-period`
4. Transizione in `reviewed` senza recensioni pubblicate

### Caso 8: Solo customer recensisce

1. **Customer** recensisce → `reviewed-by-customer`
2. **Provider** non recensisce entro 14 giorni
3. Sistema esegue `transition/expire-provider-review-period`
4. La recensione del customer viene pubblicata, transizione in `reviewed`

### Caso 9: Solo provider recensisce

1. **Provider** recensisce → `reviewed-by-provider`
2. **Customer** non recensisce entro 14 giorni
3. Sistema esegue `transition/expire-customer-review-period`
4. La recensione del provider viene pubblicata, transizione in `reviewed`

---

## 7. Email e notifiche

### Mappa completa

| Transizione trigger | Template | Destinatario | Subject (EN) |
|--------------------|----------|--------------|--------------|
| `confirm-payment` | booking-confirmed-customer | Customer | "Your booking for {listingTitle} has been confirmed" |
| `confirm-payment` | booking-confirmed-provider | Provider | "{customerDisplayName} has booked {listingTitle}" |
| `complete` | booking-money-paid | Provider | "You have been paid {amount} {currency}" |
| `complete` | booking-review-by-provider-wanted | Provider | "Leave a review for {customerDisplayName}" |
| `complete` | booking-review-by-customer-wanted | Customer | "Review your experience with {listingTitle}" |
| `review-1-by-provider` | booking-review-by-other-party-unpublished | Customer | "{otherPartyDisplayName} left you a review" |
| `review-1-by-customer` | booking-review-by-other-party-unpublished | Provider | "{otherPartyDisplayName} left you a review" |
| `review-2-by-provider` | booking-review-by-other-party-published | Customer | "Review from {otherPartyDisplayName} has been published on your profile" |
| `review-2-by-customer` | booking-review-by-other-party-published | Provider | "Review from {otherPartyDisplayName} has been published on your profile" |

### Dettaglio per attore

#### Customer

| Momento | Template | Contenuto |
|---------|----------|-----------|
| Dopo conferma pagamento | booking-confirmed-customer | Conferma prenotazione con breakdown e link all’ordine |
| Dopo complete | booking-review-by-customer-wanted | Invito a recensire l’esperienza |
| Dopo recensione provider (1ª) | booking-review-by-other-party-unpublished | Avviso che il provider ha lasciato una recensione (non ancora pubblicata) |
| Dopo recensione provider (2ª) | booking-review-by-other-party-published | Avviso che la recensione è stata pubblicata sul profilo |

#### Provider

| Momento | Template | Contenuto |
|---------|----------|-----------|
| Dopo conferma pagamento | booking-confirmed-provider | Avviso nuova prenotazione con dettagli e breakdown |
| Dopo complete | booking-money-paid | Notifica del pagamento ricevuto |
| Dopo complete | booking-review-by-provider-wanted | Invito a recensire il customer |
| Dopo recensione customer (1ª) | booking-review-by-other-party-unpublished | Avviso che il customer ha lasciato una recensione (non ancora pubblicata) |
| Dopo recensione customer (2ª) | booking-review-by-other-party-published | Avviso che la recensione è stata pubblicata sul profilo |

### File dei template

```
templates/
├── booking-confirmed-customer/
│   ├── booking-confirmed-customer-html.html
│   └── booking-confirmed-customer-subject.txt
├── booking-confirmed-provider/
│   ├── booking-confirmed-provider-html.html
│   └── booking-confirmed-provider-subject.txt
├── booking-money-paid/
│   ├── booking-money-paid-html.html
│   └── booking-money-paid-subject.txt
├── booking-review-by-customer-wanted/
│   ├── booking-review-by-customer-wanted-html.html
│   └── booking-review-by-customer-wanted-subject.txt
├── booking-review-by-provider-wanted/
│   ├── booking-review-by-provider-wanted-html.html
│   └── booking-review-by-provider-wanted-subject.txt
├── booking-review-by-other-party-unpublished/
│   ├── booking-review-by-other-party-unpublished-html.html
│   └── booking-review-by-other-party-unpublished-subject.txt
└── booking-review-by-other-party-published/
    ├── booking-review-by-other-party-published-html.html
    └── booking-review-by-other-party-published-subject.txt
```

---

## 8. Stati finali e rimborsi

### Stati finali

| Stato | Significato |
|-------|-------------|
| `payment-expired` | Pagamento non confermato in tempo; rimborso automatico |
| `cancelled` | Prenotazione annullata da operatore; rimborso completo |
| `reviewed` | Percorso completato con o senza recensioni |

### Transizioni che generano rimborsi

| Transizione | Rimborso |
|-------------|----------|
| `expire-payment` | Full refund |
| `cancel` | Full refund |

### Azioni Stripe per transizione

| Transizione | Azioni Stripe |
|-------------|---------------|
| `request-payment` | create-payment-intent |
| `request-payment-after-inquiry` | create-payment-intent |
| `expire-payment` | refund-payment |
| `confirm-payment` | confirm-payment-intent, capture-payment-intent |
| `cancel` | refund-payment |
| `complete` | create-payout |

---

## Appendice A: Comandi CLI per publish

```bash
# 1. Validare il processo localmente
flex-cli process --path ext/transaction-processes/instant-booking

# 2. Creare il processo sul marketplace
flex-cli process create --path ext/transaction-processes/instant-booking --process instant-booking -m <MARKETPLACE_ID>

# 3. Creare l'alias release-1
flex-cli process create-alias --process instant-booking --version 1 --alias release-1 -m <MARKETPLACE_ID>
```

---

## Appendice B: Variabili temporali Sharetribe

| Timepoint | Significato |
|-----------|-------------|
| `[:time/first-entered-state :state/X]` | Momento del primo ingresso nello stato X |
| `[:time/booking-start]` | Inizio del periodo di noleggio |
| `[:time/booking-end]` | Fine del periodo di noleggio (ritorno/consegna) |

---

*Documento generato per il processo instant-booking, versione release-1.*
