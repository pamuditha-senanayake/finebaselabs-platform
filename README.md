# FineBase Labs Portal

A dark-only refund portal for FineBase Labs, built with Next.js 15 (App Router),
TypeScript, Tailwind CSS and shadcn/ui. Customers submit refund requests,
FineBrain evaluates them automatically, and anything it can't decide is
escalated to a human review queue.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will land on the login
screen, which offers one-click demo sign-in buttons:

- **Customer** — `client@finebase.com`
- **Admin** — `admin@finebase.com`

Both demo accounts use the password `password123`.

## Mock mode

The portal ships with no backend. Everything runs against an in-browser mock so
the full flow can be demonstrated end-to-end.

### The `lib/api` seam

Components never touch mock data directly — **all data access goes through
`lib/api/*`** (`transactions.ts`, `requests.ts`, `tickets.ts`, `users.ts`,
`auth.ts`, `finebrain.ts`). Each module re-exposes an async, promise-based API
that mirrors what a real backend would offer. Today those functions read and
write a client-side Zustand store (`lib/store.ts`, persisted to the
`finebase-portal` key in `localStorage`) seeded from `lib/mock-data.ts`.

This is the seam for the real backend: replace the bodies of the `lib/api/*`
functions with `fetch` calls and the components do not change.

### FineBrain integration

`lib/api/finebrain.ts` is where the real FineBrain integration plugs in:

- `sendToFineBrain()` builds the documented `REFUND_EVALUATION_REQUEST` payload
  that the portal sends to FineBrain. It currently returns the payload instead
  of POSTing it — swap in the real call to the FineBrain evaluate endpoint
  (via the backend) here.
- `applyBrainDecision()` applies a FineBrain decision callback
  (`APPROVED` / `REJECTED` / `ESCALATED_HUMAN`), writing the request status,
  confidence score and decision summary, and appending a `RequestEvent`. Point
  this at the real webhook handler when the backend exists.
- `executePayment()` performs the payout and marks the transaction refunded; the
  callback only records a decision and never drives payment.

The human-review path lives in `lib/api/requests.ts#adminDecision` (approve /
reject) and respects the request state machine (`canTransition` in
`lib/store.ts`).

### Demo toolbar

`components/dashboard/demo-toolbar.tsx` is a collapsible floating panel mounted
in both the dashboard and admin layouts. It is only rendered when
`NEXT_PUBLIC_DEMO_MODE=true`, which is set in `.env.local` (see `.env.example`).
Set it to `false` (or remove it) to hide the panel entirely.

The toolbar can:

- **Switch to Customer / Switch to Admin** — swap the mock session cookie and
  redirect.
- **Reset Mock Data** — restore the seed data (see below).
- **Simulate FineBrain: Approve / Reject / Escalate** — available on a request
  detail page. These call `applyBrainDecision()` with a payload matching the real
  callback shape (`request_id`, `status`, `confidence_score`,
  `decision_summary`, `timestamp`), followed by `executePayment()` on approve.

The panel is labelled "Mock FineBrain callback, remove when the real webhook is
connected" — remove the component (and its layout mounts) once the real
integration is live.

### Resetting data

The mock store is persisted in `localStorage` under the `finebase-portal` key.
Reset it by either:

- Clicking **Reset Mock Data** in the demo toolbar (calls `resetMockData()`,
  which re-seeds the store from `lib/mock-data.ts`), or
- Clearing the `finebase-portal` entry in `localStorage` and reloading.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
