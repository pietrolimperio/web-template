# Default Booking Transaction Process — Documentazione completa

## Indice

1. [Panoramica](#1-panoramica)
2. [Confronto con instant-booking](#2-confronto-con-instant-booking)
3. [Diagramma degli stati](#3-diagramma-degli-stati)
4. [Transizioni e attori](#4-transizioni-e-attori)
5. [Timing e scadenze](#5-timing-e-scadenze)
6. [Casi d'uso dettagliati](#6-casi-duso-dettagliati)
7. [Email e notifiche](#7-email-e-notifiche)
8. [Stati finali e rimborsi](#8-stati-finali-e-rimborsi)

---

## 1. Panoramica

Il processo **default-booking** è un transaction process per prenotazioni con **approvazione manuale del provider**: il pagamento viene preautorizzato alla conferma del customer, ma viene incassato solo dopo che il provider accetta la richiesta.

### Caratteristiche principali

| Aspetto | Descrizione |
|---------|-------------|
| **Tipo** | Booking con approvazione provider |
| **Provider** | Deve accettare o rifiutare entro la scadenza |
| **Pagamento** | Preautorizzato con confirm-payment, catturato con accept |
| **Payout** | `booking-end` + 4 giorni |
| **Recensioni** | Periodo 14 giorni (blind reviews) |
| **Unit types** | day, night, hour, fixed |

### Quando usarlo

- Listings di **privati** che vogliono controllare le prenotazioni
- Prodotti/servizi che richiedono verifica di disponibilità
- Flusso B2C con approvazione manuale

---

## 2. Confronto con instant-booking

| Fase | default-booking | instant-booking |
|------|-----------------|-----------------|
| **Dopo confirm-payment** | Stato `preauthorized` → provider deve accettare | Stato `booked` → booking confermato subito |
| **Pagamento** | Addebitato solo dopo accept | Addebitato subito con confirm-payment |
| **Provider** | Deve accettare entro 6 giorni o 2 giorni prima di booking-start | Nessuna azione richiesta |
| **Payout** | `booking-end` + 4 giorni | `booking-end` + 4 giorni |
| **Email dopo conferma** | booking-new-request (provider), booking-accepted-request (customer) | booking-confirmed-customer, booking-confirmed-provider |
| **Stati aggiuntivi** | preauthorized, accepted, declined, expired | Nessuno |

---

## 3. Diagramma degli stati

```
                                    ┌─────────────────┐
                                    │    initial      │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │ inquire                │ request-payment         │
                    ▼                        ▼                        │
            ┌───────────────┐        ┌───────────────────┐          │
            │   inquiry     │        │  pending-payment  │          │
            └───────┬───────┘        └─────────┬──────────┘          │
                    │ request-payment-after-  │                       │
                    │ inquiry                 │                       │
                    └────────────────────────┘                       │
                             │                    │                   │
                             │                    │ expire-payment    │
                             │                    │ (15 min)          │
                             │                    ▼                   │
                             │            ┌───────────────────┐       │
                             │            │  payment-expired   │       │
                             │            └───────────────────┘       │
                             │                    │                   │
                             │                    │ confirm-payment   │
                             │                    ▼                   │
                             │            ┌───────────────────┐       │
                             │            │   preauthorized    │       │
                             │            └─────────┬──────────┘       │
                             │                      │                 │
                             │         ┌────────────┼────────────┐   │
                             │         │            │            │   │
                             │    accept      decline     expire     │
                             │  (operator)  (operator)   (system)    │
                             │         │            │      │        │
                             │         ▼            ▼      ▼        │
                             │  ┌──────────┐ ┌──────────┐ ┌────────┐│
                             │  │ accepted │ │ declined │ │ expired││
                             │  └────┬─────┘ └──────────┘ └────────┘│
                             │       │                               │
                             │       │ complete / operator-complete │
                             │       │ (at booking-end + 4 giorni)   │
                             │       ▼                               │
                             │  ┌───────────────────┐                │
                             │  │     delivered     │                │
                             │  └─────────┬─────────┘                │
                             │            │                           │
                             │  ┌─────────┼────────────┐              │
                             │  │         │           │              │
                             │  review-1-by-  review-1-by-  expire-  │
                             │  provider      customer    review-    │
                             │  │         │           │  period      │
                             │  │         │           │  (14D)       │
                             │  ▼         ▼           │              │
                             │  ┌──────────────┐ ┌──────────────┐│    │
                             │  │reviewed-by-  │ │reviewed-by-  ││    │
                             │  │  provider    │ │  customer    │    │
                             │  └──────┬───────┘ └──────┬───────┘    │
                             │         │                 │           │
                             │         │ review-2        │ review-2   │
                             │         │ (or expire)     │ (or expire)│
                             │         └────────┬────────┘           │
                             │                  ▼                     │
                             │         ┌───────────────────┐          │
                             │         │     reviewed      │          │
                             │         └───────────────────┘          │
                             │                                         │
                             │   accepted ──cancel──► cancelled      │
                             └─────────────────────────────────────────┘
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
| `transition/confirm-payment` | customer | pending-payment | preauthorized | No | Solo conferma PaymentIntent, preautorizza |
| `transition/accept` | provider | preauthorized | accepted | No | Accetta booking e cattura pagamento |
| `transition/operator-accept` | operator | preauthorized | accepted | No | Operatore accetta per conto del provider |
| `transition/decline` | provider | preauthorized | declined | No | Rifiuta e rimborsa |
| `transition/operator-decline` | operator | preauthorized | declined | No | Operatore rifiuta per conto del provider |
| `transition/expire` | system | preauthorized | expired | — | Provider non risponde in tempo |
| `transition/complete` | system | accepted | delivered | — | Automatico a booking-end + 4 giorni |
| `transition/operator-complete` | operator | accepted | delivered | — | Operatore completa manualmente |
| `transition/cancel` | operator | accepted | cancelled | — | Solo operatore |
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
| `preauthorized` | Pagamento preautorizzato, in attesa che provider accetti o rifiuti |
| `accepted` | Provider ha accettato, pagamento catturato |
| `declined` | Provider ha rifiutato la richiesta |
| `expired` | Provider non ha risposto entro la scadenza |
| `cancelled` | Prenotazione annullata da operatore (dopo accept) |
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
| Scadenza provider (expire) | Min(6 giorni, 2 giorni prima booking-start, booking-end) | Formula complessa |
| Complete (payout) | 4 giorni dopo la fine del noleggio | `booking-end` + P4D |
| Periodo recensioni | 14 giorni | `P14D` da `booking-end` |
| Scadenza recensioni | 14 giorni | `P14D` da `booking-end` |

### Dettaglio formule temporali

#### 1. Scadenza pagamento (`expire-payment`)

```
at = first-entered-state(pending-payment) + 15 minuti
```

- **Quando**: 15 minuti dopo l'ingresso in `pending-payment`
- **Effetto**: Rimborso automatico, transizione in `payment-expired`

#### 2. Scadenza provider (`expire`)

```
at = min(
  first-entered-state(preauthorized) + 6 giorni,
  booking-start + 2 giorni (prima dell'inizio),
  booking-end
)
```

- **Quando**: La **prima** delle tre date a verificarsi:
  1. 6 giorni dopo l'ingresso in `preauthorized`
  2. 2 giorni prima dell'inizio del noleggio (`booking-start`)
  3. Fine del noleggio (`booking-end`)
- **Effetto**: Rimborso automatico, transizione in `expired`
- **Nota**: Garantisce che il provider abbia tempo di rispondere, ma non oltre l'inizio del noleggio

#### 3. Complete (`complete`)

```
at = booking-end + 4 giorni
```

- **Quando**: 4 giorni dopo la fine del periodo di noleggio
- **Effetto**: Creazione payout per il provider, transizione in `delivered`

#### 4. Scadenza periodo recensioni (`expire-review-period`)

```
at = booking-end + 14 giorni
```

- **Da**: `delivered` (se nessuno ha ancora recensito)
- **Effetto**: Transizione in `reviewed` senza pubblicare recensioni

#### 5. Scadenza recensione provider (`expire-provider-review-period`)

```
at = booking-end + 14 giorni
```

- **Da**: `reviewed-by-customer` (customer ha recensito, provider no)
- **Effetto**: Pubblicazione recensione customer, transizione in `reviewed`

#### 6. Scadenza recensione customer (`expire-customer-review-period`)

```
at = booking-end + 14 giorni
```

- **Da**: `reviewed-by-provider` (provider ha recensito, customer no)
- **Effetto**: Pubblicazione recensione provider, transizione in `reviewed`

---

## 6. Casi d'uso dettagliati

### Caso 1: Prenotazione diretta con accettazione provider

1. **Customer** sceglie date e prezzo → `transition/request-payment` (privileged)
2. Sistema crea PaymentIntent, transizione in `pending-payment`
3. **Customer** completa pagamento su Stripe e conferma → `transition/confirm-payment`
4. Transizione in `preauthorized` (pagamento preautorizzato, non ancora catturato)
5. Email a **provider** (booking-new-request): "X ha richiesto di prenotare Y"
6. **Provider** accetta → `transition/accept`
7. Sistema: `accept-booking`, `stripe-capture-payment-intent`
8. Transizione in `accepted`
9. Email a **customer** (booking-accepted-request): "La tua richiesta è stata accettata"
10. A `booking-end` + 4 giorni: `transition/complete` automatico
11. Email a **provider** (booking-money-paid, booking-review-by-provider-wanted)
12. Email a **customer** (booking-review-by-customer-wanted)
13. Fase recensioni (come instant-booking)

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

### Caso 4: Provider rifiuta la richiesta

1. Transazione in `preauthorized`
2. **Provider** rifiuta → `transition/decline`
3. Rimborso completo, transizione in `declined`
4. Email a **customer** (booking-declined-request): "La tua richiesta è stata rifiutata"

### Caso 5: Operatore rifiuta per conto del provider

1. Transazione in `preauthorized`
2. **Operatore** rifiuta → `transition/operator-decline`
3. Rimborso completo, transizione in `declined`
4. Email a **customer** (booking-declined-request)
5. Email a **provider** (booking-operator-declined-request): "Una richiesta è stata rifiutata per tuo conto"

### Caso 6: Provider non risponde in tempo (expire)

1. Transazione in `preauthorized`
2. Nessuna risposta del provider entro la scadenza (min di 6 giorni, 2 giorni prima di booking-start, booking-end)
3. Sistema esegue `transition/expire`
4. Rimborso completo, transizione in `expired`
5. Email a **customer** (booking-expired-request): "La tua richiesta è scaduta"

### Caso 7: Operatore accetta per conto del provider

1. Transazione in `preauthorized`
2. **Operatore** accetta → `transition/operator-accept`
3. Transizione in `accepted`
4. Email a **customer** (booking-accepted-request)
5. Email a **provider** (booking-operator-accepted-request): "Una richiesta è stata accettata per tuo conto"

### Caso 8: Annullamento da operatore (dopo accept)

1. Transazione in `accepted`
2. **Operatore** esegue `transition/cancel`
3. Rimborso completo, transizione in `cancelled`

### Caso 9: Operatore completa manualmente

1. Transazione in `accepted`
2. **Operatore** esegue `transition/operator-complete` (prima di booking-end + 4 giorni)
3. Transizione in `delivered`
4. Email a **provider** (booking-money-paid-operator-complete, booking-review-by-provider-wanted)
5. Email a **customer** (booking-review-by-customer-wanted)

### Caso 10-14: Recensioni (identici a instant-booking)

- Customer recensisce per primo → provider riceve unpublished, poi published
- Provider recensisce per primo → customer riceve unpublished, poi published
- Nessuna recensione → expire-review-period
- Solo customer recensisce → expire-provider-review-period
- Solo provider recensisce → expire-customer-review-period

---

## 7. Email e notifiche

### Mappa completa

| Transizione trigger | Template | Destinatario | Subject (EN) |
|--------------------|----------|--------------|--------------|
| `confirm-payment` | booking-new-request | Provider | "{customerDisplayName} requested to book {listingTitle}" |
| `accept` | booking-accepted-request | Customer | "Your booking request was accepted" |
| `operator-accept` | booking-accepted-request | Customer | "Your booking request was accepted" |
| `operator-accept` | booking-operator-accepted-request | Provider | "A booking request was accepted on your behalf" |
| `decline` | booking-declined-request | Customer | "Your booking request was declined" |
| `operator-decline` | booking-declined-request | Customer | "Your booking request was declined" |
| `operator-decline` | booking-operator-declined-request | Provider | "A booking request was declined on your behalf" |
| `expire` | booking-expired-request | Customer | "Your booking request expired" |
| `complete` | booking-money-paid | Provider | "You have been paid {amount} {currency}" |
| `complete` | booking-review-by-provider-wanted | Provider | "Leave a review for {customerDisplayName}" |
| `complete` | booking-review-by-customer-wanted | Customer | "Review your experience with {listingTitle}" |
| `operator-complete` | booking-money-paid-operator-complete | Provider | "You have been paid {amount} {currency}" |
| `operator-complete` | booking-review-by-provider-wanted | Provider | "Leave a review for {customerDisplayName}" |
| `operator-complete` | booking-review-by-customer-wanted | Customer | "Review your experience with {listingTitle}" |
| `review-1-by-provider` | booking-review-by-other-party-unpublished | Customer | "{otherPartyDisplayName} left you a review" |
| `review-1-by-customer` | booking-review-by-other-party-unpublished | Provider | "{otherPartyDisplayName} left you a review" |
| `review-2-by-provider` | booking-review-by-other-party-published | Customer | "Review from {otherPartyDisplayName} has been published on your profile" |
| `review-2-by-customer` | booking-review-by-other-party-published | Provider | "Review from {otherPartyDisplayName} has been published on your profile" |

### Dettaglio per attore

#### Customer

| Momento | Template | Contenuto |
|---------|----------|-----------|
| Dopo accept (provider o operatore) | booking-accepted-request | Conferma richiesta accettata con breakdown |
| Dopo decline (provider o operatore) | booking-declined-request | Avviso richiesta rifiutata |
| Dopo expire | booking-expired-request | Avviso richiesta scaduta |
| Dopo complete | booking-review-by-customer-wanted | Invito a recensire |
| Dopo recensione provider (1ª) | booking-review-by-other-party-unpublished | Avviso recensione ricevuta (non pubblicata) |
| Dopo recensione provider (2ª) | booking-review-by-other-party-published | Avviso recensione pubblicata |

#### Provider

| Momento | Template | Contenuto |
|---------|----------|-----------|
| Dopo confirm-payment | booking-new-request | Nuova richiesta di prenotazione con CTA Accept/Decline |
| Dopo operator-accept | booking-operator-accepted-request | Richiesta accettata per suo conto |
| Dopo operator-decline | booking-operator-declined-request | Richiesta rifiutata per suo conto |
| Dopo complete | booking-money-paid | Notifica pagamento ricevuto |
| Dopo complete | booking-review-by-provider-wanted | Invito a recensire il customer |
| Dopo operator-complete | booking-money-paid | Notifica pagamento ricevuto |
| Dopo operator-complete | booking-review-by-provider-wanted | Invito a recensire |
| Dopo recensione customer (1ª) | booking-review-by-other-party-unpublished | Avviso recensione ricevuta |
| Dopo recensione customer (2ª) | booking-review-by-other-party-published | Avviso recensione pubblicata |

### File dei template

```
templates/
├── booking-new-request/
├── booking-accepted-request/
├── booking-declined-request/
├── booking-expired-request/
├── booking-operator-accepted-request/
├── booking-operator-declined-request/
├── booking-money-paid/
├── booking-review-by-customer-wanted/
├── booking-review-by-provider-wanted/
├── booking-review-by-other-party-unpublished/
└── booking-review-by-other-party-published/
```

---

## 8. Stati finali e rimborsi

### Stati finali

| Stato | Significato |
|-------|-------------|
| `payment-expired` | Pagamento non confermato in tempo; rimborso automatico |
| `declined` | Provider ha rifiutato; rimborso completo |
| `expired` | Provider non ha risposto in tempo; rimborso automatico |
| `cancelled` | Annullamento da operatore dopo accept; rimborso completo |
| `reviewed` | Percorso completato con o senza recensioni |

### Transizioni che generano rimborsi

| Transizione | Rimborso |
|-------------|----------|
| `expire-payment` | Full refund |
| `decline` | Full refund |
| `operator-decline` | Full refund |
| `expire` | Full refund |
| `cancel` | Full refund |

### Azioni Stripe per transizione

| Transizione | Azioni Stripe |
|-------------|---------------|
| `request-payment` | create-payment-intent |
| `request-payment-after-inquiry` | create-payment-intent |
| `expire-payment` | refund-payment |
| `confirm-payment` | confirm-payment-intent (solo preautorizza) |
| `accept` | capture-payment-intent |
| `operator-accept` | capture-payment-intent |
| `decline` | refund-payment |
| `operator-decline` | refund-payment |
| `expire` | refund-payment |
| `cancel` | refund-payment |
| `complete` | create-payout |
| `operator-complete` | create-payout |

---

## Appendice A: Comandi CLI per publish

```bash
# 1. Validare il processo localmente
flex-cli process --path ext/transaction-processes/default-booking

# 2. Push del processo (dopo modifiche)
flex-cli process push --path ext/transaction-processes/default-booking --process default-booking -m <MARKETPLACE_ID>

# 3. Aggiornare l'alias release-1 alla nuova versione
flex-cli process update-alias --process default-booking --alias release-1 --version <N> -m <MARKETPLACE_ID>
```

---

## Appendice B: Variabili temporali Sharetribe

| Timepoint | Significato |
|-----------|-------------|
| `[:time/first-entered-state :state/X]` | Momento del primo ingresso nello stato X |
| `[:time/booking-start]` | Inizio del periodo di noleggio |
| `[:time/booking-end]` | Fine del periodo di noleggio (ritorno/consegna) |

---

*Documento generato per il processo default-booking, versione release-1.*
