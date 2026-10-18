# AGENTS.md

## Stack

- Next.js 15 with the App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components

## Theme

Dark-only. Do not add light mode or theme toggles.

- Background: `#0B0F17`
- Borders: `border-slate-800/60`
- Accent: `#3B82F6`
- Success: `#10B981`

## Platform direction

This section is authoritative: where other sections of this file or
`README.md` describe admin, support or demo-tooling behaviour, they describe
what must not be built here.

- This repo is a **customer-only purchasing platform**. Admin and support
  functionality lives in the separate **FineBrain platform** and must not
  exist here — no `/admin/*` routes, no review queues, no product
  administration, no support tooling in this codebase.
- The only role is `CUSTOMER`. Do not add any other roles, role switchers,
  or role-gated UI.
- The landing page after login is `/dashboard/store` (not `/dashboard`).
- Sidebar navigation is exactly: **Store**, **Purchases**
  (`/dashboard/transactions`), **Refund Requests**, **Account**
  (`/dashboard/account`).
- The cart is a **header icon** (with badge), not a sidebar entry.
- The old Overview page is **merged into the Account page** — `/dashboard`
  should not exist as a separate overview; account/profile, and any overview
  metrics, live on `/dashboard/account`.
- `ESCALATED_HUMAN` is shown to customers as **"Under review"** with **no
  actions** available. It is resolved only by a FineBrain decision callback
  (`applyBrainDecision`) — never by any in-portal admin/support action.
- A customer-facing **assistant UI** exists (mock only; no real backend).
- **No demo toolbar.** Do not add demo toolbars, role switchers, or
  simulate-decision panels to the UI.

## Roles

- `CUSTOMER`

## Statuses

- `PENDING_BRAIN_REVIEW`
- `APPROVED`
- `REJECTED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `ESCALATED_HUMAN`

## Routes

- `/login`
- `/dashboard`
- `/dashboard/requests`
- `/dashboard/requests/[id]`

## Data Model

The target Prisma schema. `lib/types.ts` mirrors these models; mock data in
`lib/mock-data.ts` follows the same shape.

```prisma
enum Role {
  CUSTOMER
}

enum RequestStatus {
  PENDING_BRAIN_REVIEW
  APPROVED
  REJECTED
  PROCESSING
  COMPLETED
  FAILED
  ESCALATED_HUMAN
}

enum TransactionStatus {
  SUCCESS
  REFUND_REQUESTED
  REFUNDED
}

enum EventActor {
  SYSTEM
  FINEBRAIN
  CUSTOMER
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())

  transactions   Transaction[]
  refundRequests RefundRequest[]
  tickets        Ticket[]
}

model Transaction {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  amount      Int               // minor units (cents)
  currency    String            @default("USD")
  status      TransactionStatus @default(SUCCESS)
  description String
  merchant    String?
  reference   String            @unique
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  refundRequests RefundRequest[]
}

model RefundRequest {
  id            String        @id @default(cuid())
  transactionId String
  transaction   Transaction   @relation(fields: [transactionId], references: [id])
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  status        RequestStatus @default(PENDING_BRAIN_REVIEW)
  reason        String
  brainDecision String?       // FineBrain decision summary
  confidence    Float?        // 0..1 confidence score
  amount        Int           // minor units (cents)
  currency      String        @default("USD")
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  events RequestEvent[]
}

model RequestEvent {
  id              String        @id @default(cuid())
  refundRequestId String
  refundRequest   RefundRequest @relation(fields: [refundRequestId], references: [id])
  status          RequestStatus
  actor           EventActor    @default(SYSTEM)
  message         String
  createdAt       DateTime      @default(now())
}

model Ticket {
  id        String         @id @default(cuid())
  userId    String
  user      User           @relation(fields: [userId], references: [id])
  subject   String
  body      String
  status    TicketStatus   @default(OPEN)
  priority  TicketPriority @default(MEDIUM)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}
```

## FineBrain Integration

The portal never calls FineBrain directly; the backend owns the integration.
The portal builds and sends these two documented shapes.

**Units at the FineBrain boundary:** the internal data model (Prisma,
`lib/types.ts`, `lib/store.ts`, `lib/api/*`) stores amounts as integer minor
units (cents). The `REFUND_EVALUATION_REQUEST` payload uses decimal major
units (e.g. `299.00`) to match the FineBrain spec. The conversion happens only
in `lib/api/finebrain.ts#sendToFineBrain` — never store or compute in major
units elsewhere.

`REFUND_EVALUATION_REQUEST` — portal → FineBrain, built by
`lib/api/finebrain.ts#sendToFineBrain`:

```json
{
  "type": "REFUND_EVALUATION_REQUEST",
  "request_id": "rfr_...",
  "reason": "Annual subscription — duplicate charge",
  "requested_amount": 299.00,
  "currency": "USD",
  "customer": { "id": "usr_...", "name": "Alex Morgan", "email": "client@finebase.com" },
  "transaction": {
    "id": "txn_...",
    "reference": "TXN-2026-0002",
    "amount": 299.00,
    "currency": "USD",
    "status": "REFUND_REQUESTED",
    "description": "Annual subscription — duplicate charge",
    "merchant": "FineBase Cloud",
    "created_at": "2026-03-02T09:14:00.000Z"
  },
  "product": {
    "product_id": "prd_...",
    "name": "Managed Cloud Hosting",
    "type": "SERVICE",
    "price": 49.00,
    "purchase_date": "2026-03-02T09:14:00.000Z",
    "days_since_purchase": 0,
    "refund_window_days": 14
  },
  "created_at": "2026-03-02T09:22:00.000Z"
}
```

`product` is included for store purchases, linking the refund to the catalog
item; it is `null` for transactions that did not originate from the store.
`type` is `SERVICE` or `PRODUCT`.

Decision callback — FineBrain → portal, handled by
`lib/api/finebrain.ts#applyBrainDecision`:

```json
{
  "request_id": "rfr_...",
  "status": "APPROVED",
  "confidence_score": 0.86,
  "decision_summary": "Duplicate charge confirmed; approved automatically.",
  "timestamp": "2026-03-02T09:22:04.000Z"
}
```

`status` is one of `APPROVED`, `REJECTED`, `ESCALATED_HUMAN`. The callback only
applies a decision — it never drives payment. Payment (and the resulting
`REFUNDED` transaction) is triggered separately by `executePayment`.

## Data Access

- Components must never import mock data directly.
- All data access goes through `lib/api/*`.

## Backend

- No backend yet. `lib/api/*` provides the abstraction layer over mock data.

## Store / Commerce

### Routes

- `/dashboard/store` — catalog listing
- `/dashboard/store/[slug]` — product detail
- `/dashboard/cart` — cart
- `/dashboard/checkout` — checkout
- `/dashboard/checkout/success` — order confirmation

### Models

Follow the existing Prisma/`lib/types.ts` conventions (amounts in minor units,
`currency` string defaulting to `"USD"`, `Date` fields in TS).

- `Product`: `type` is `SERVICE` or `PRODUCT`; `price` (minor units),
  `currency`, `refundable` (bool), `refundWindowDays`, `stock`, `active`.
- `CartItem`: user-scoped cart line (product, quantity).
- `Order` and `OrderItem`: an order snapshot with per-line items (product,
  quantity, unit price).

A purchase creates a `Transaction` linked by `productId` / `orderId`, so store
purchases flow through the same refund pipeline as existing transactions.

### Conventions

- Refund eligibility for store purchases (product `refundable`,
  `refundWindowDays`, stock/order state) is enforced inside `lib/api/*` — never
  only in the UI.
- Checkout never collects card data: the pay step is a mock confirmation.
  TODO: replace with a hosted Stripe / PayPal checkout.
- Components never import `lib/store` or `lib/mock-data` directly; all data
  access goes through `lib/api/*`, matching the existing seam.
- Follow the existing amount/currency convention: integer minor units (cents)
  plus a `currency` string, as in `Transaction` and `RefundRequest`.
