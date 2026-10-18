# FineBase Labs Portal

A dark-only, customer-only purchasing and refund portal for FineBase Labs,
built with Next.js 15 (App Router), TypeScript, Tailwind CSS and shadcn/ui.
Customers buy from the store, submit refund requests, and FineBrain (separate
platform) evaluates them automatically — anything it can't decide is escalated
for human review inside FineBrain and resolved only by a FineBrain decision
callback.

## Platform direction

Authoritative constraints (mirrored in `AGENTS.md`):

- **Customer-only.** The only role is `CUSTOMER`. No admin routes, review
  queues, product administration, support tooling, role switchers or demo
  toolbars exist or may exist here — that functionality lives in FineBrain.
- After login you land on **`/dashboard/store`**. `/dashboard` is only a
  redirect.
- Sidebar: **Store**, **Purchases**, **Refund Requests**, **Account**. The
  cart is a header icon with a badge. Overview was merged into Account.
- `ESCALATED_HUMAN` is shown to customers as **"Under review"** with no
  actions.
- The **assistant** is UI-only with canned mock replies — no real AI call.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will land on the login
screen, which offers a one-click demo sign-in button:

- **Customer** — `client@finebase.com`

All demo accounts use the password `password123`.

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Demo sign-in |
| `/dashboard/store` | Store catalog (post-login landing) |
| `/dashboard/store/[slug]` | Product detail |
| `/dashboard/cart` | Cart |
| `/dashboard/checkout` | Checkout (mock pay step) |
| `/dashboard/checkout/success` | Order confirmation |
| `/dashboard/transactions` | Purchases |
| `/dashboard/requests` | Refund requests list |
| `/dashboard/requests/[id]` | Refund request detail + timeline |
| `/dashboard/account` | Profile, stats, recent purchases/requests, sign-out |
| `/dashboard` | Redirects to `/dashboard/store` |

## Mock mode

The portal ships with no backend. Everything runs against an in-browser mock so
the full flow can be demonstrated end-to-end.

### The `lib/api` seam

Components never touch mock data directly — **all data access goes through
`lib/api/*`** (`products.ts`, `cart.ts`, `checkout.ts`, `orders.ts`,
`transactions.ts`, `requests.ts`, `finebrain.ts`, `payments.ts`, `auth.ts`,
`realtime.ts`, `assistant.ts`, plus `users.ts` / `tickets.ts` for the data
model). Each module re-exposes an async, promise-based API that mirrors what a
real backend would offer. Today those functions read and write a client-side
Zustand store (`lib/store.ts`, persisted to the `finebase-portal` key in
`localStorage`) seeded from `lib/mock-data.ts`.

This is the seam for the real backend: replace the bodies of the `lib/api/*`
functions with `fetch` calls and the components do not change.

### Commerce data flow

The store → cart → checkout → refund pipeline, all through `lib/api/*`:

1. **Browse** — `/dashboard/store` lists active products
   (`lib/api/products.ts#listProducts`).
2. **Cart** — `/dashboard/cart` reads and mutates the user-scoped cart
   (`lib/api/cart.ts`). Quantity limits (1–10, services locked to 1) and stock
   are enforced here, not in the UI.
3. **Checkout** — `lib/api/checkout.ts#placeOrder` re-validates the whole cart
   (product active, quantity, stock, single currency) **before** taking
   payment, then `createOrder` snapshots the order, creates transactions and
   decrements stock. Amounts are integer minor units (cents).
4. **Transactions** — store purchases create a `Transaction` linked by
   `productId` / `orderId`, so they flow through the same refund pipeline as
   direct charges.
5. **Refund request** — `lib/api/requests.ts#submitRefund` enforces eligibility
   inside the API layer (transaction status, product `refundable` flag,
   `refundWindowDays`, one active request at a time, rejected-attempt limit),
   then the transaction moves to `REFUND_REQUESTED`.
6. **Decision** — FineBrain (`applyBrainDecision`) resolves the request.
   Approvals run `executePayment`, which marks the transaction `REFUNDED` and
   restocks the product. Rejections restore the transaction to `SUCCESS` so the
   customer can see the charge again and, if still within the window,
   re-request later. Escalated requests (`ESCALATED_HUMAN`) are shown as
   "Under review" with no actions.
7. **Persistence** — the Zustand store (`finebase-portal` in `localStorage`)
   holds products, carts, transactions, orders, refund requests and events;
   ISO date strings are revived on load. Clear the `finebase-portal` entry and
   reload to restore seed data.

## Assistant (mock)

The floating sparkles button (bottom right) opens a full-screen assistant
overlay — UI only, with canned mock replies:

- `lib/api/assistant.ts#askAssistant(userId, message)` answers from the mock
  catalog and the user's latest purchase (refund windows, order status, support
  hours, how to request a refund) after a short artificial delay.
- **Voice mode** (fake state machine: listening → thinking → speaking, no real
  audio) and **text mode** (thread with typing indicator). Suggestion chips
  send canned questions. Conversation history is in component state only.
- The orb animation respects `prefers-reduced-motion`.

## FineBrain integration

`lib/api/finebrain.ts` is where the real FineBrain integration plugs in:

- `sendToFineBrain()` builds the documented `REFUND_EVALUATION_REQUEST` payload
  (amounts converted to decimal major units only at this boundary). It returns
  the payload instead of POSTing it.
- `applyBrainDecision()` applies a FineBrain decision callback
  (`APPROVED` / `REJECTED` / `ESCALATED_HUMAN`), writing status, confidence
  score, decision summary and a `RequestEvent`.
- `executePayment()` performs the mock payout and marks the transaction
  refunded; a callback only records a decision and never drives payment.
- Decisions flow through the request state machine (`canTransition` in
  `lib/store.ts`).

The documented payload shapes live in `AGENTS.md`.

## TODOs

- **FineBrain chat endpoint** — `lib/api/assistant.ts` is canned text only.
  Route it through the backend to the real FineBrain chat endpoint.
- **Real FineBrain callback** — `sendToFineBrain` currently returns the payload
  instead of POSTing it, and `applyBrainDecision` is invoked directly; wire a
  real webhook/callback handler on the backend.
- **Payment gateway** — `lib/api/payments.ts` (checkout charge) and
  `executePayment` (refund payout) are mocks. Replace with a real gateway
  (Stripe / PayPal) via the backend; checkout never collects card data today.
- **Backend** — every `lib/api/*` function is the swap point for real
  persistence and auth. The documented FineBrain request/callback shapes in
  `AGENTS.md` stay the same.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
