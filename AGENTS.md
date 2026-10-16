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

## Roles

- `CUSTOMER`
- `ADMIN`
- `SUPPORT_AGENT`

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
- `/admin/review-queue`

## Data Model

The target Prisma schema. `lib/types.ts` mirrors these models; mock data in
`lib/mock-data.ts` follows the same shape.

```prisma
enum Role {
  CUSTOMER
  ADMIN
  SUPPORT_AGENT
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
  SUPPORT_AGENT
  ADMIN
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
The portal builds and sends these two documented shapes. Amounts are in minor
units (cents).

`REFUND_EVALUATION_REQUEST` — portal → FineBrain, built by
`lib/api/finebrain.ts#sendToFineBrain`:

```json
{
  "type": "REFUND_EVALUATION_REQUEST",
  "request_id": "rfr_...",
  "reason": "Annual subscription — duplicate charge",
  "requested_amount": 29900,
  "currency": "USD",
  "customer": { "id": "usr_...", "name": "Alex Morgan", "email": "client@finebase.com" },
  "transaction": {
    "id": "txn_...",
    "reference": "TXN-2026-0002",
    "amount": 29900,
    "currency": "USD",
    "status": "REFUND_REQUESTED",
    "description": "Annual subscription — duplicate charge",
    "merchant": "FineBase Cloud",
    "created_at": "2026-03-02T09:14:00.000Z"
  },
  "created_at": "2026-03-02T09:22:00.000Z"
}
```

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
