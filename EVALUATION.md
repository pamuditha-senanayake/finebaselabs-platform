# FineBase Labs Portal — Evaluation

Audit of the FineBase Labs refund portal against `AGENTS.md` and the ten
requested criteria. **Report only — no code was changed during this audit.**

- Audit date: 2026-10-16
- Scope: `app/`, `components/`, `hooks/`, `lib/`, `middleware.ts`, config
- Commands run: `npm run lint`, `npx tsc --noEmit`, `npm run build`

## Verification commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | **PASS** | `eslint` exits 0; no warnings or errors. |
| `npx tsc --noEmit` | **PASS** | Exit 0, strict mode, no diagnostics. |
| `npm run build` | **PASS** | Compiled; 12 routes generated. See table below. |

> Caveat on `tsc`: it was first run **concurrently** with `next build`, which
> deleted/regenerated `.next/types/**/*.ts` while `tsc` was reading it, producing
> a burst of `TS6053 File '.next/types/...' not found`. Re-run alone, `tsc`
> exits 0. `tsconfig.json:25` includes `.next/types/**/*.ts`, so avoid running
> the two commands in parallel.

Build route table (all AGENTS.md routes present, plus `/dashboard/transactions`
and `/auth/callback`):

```
○ /                       ○ /dashboard              ○ /admin/review-queue
○ /login                  ○ /dashboard/requests     ƒ /dashboard/requests/[id]
○ /auth/callback          ○ /dashboard/transactions ƒ /api/mock-auth
○ /_not-found
```

---

## 1. Conventions — **PASS** (10/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| Roles `CUSTOMER`, `ADMIN`, `SUPPORT_AGENT` | PASS | `lib/types.ts:1` |
| Statuses incl. `ESCALATED_HUMAN` (all 7) | PASS | `lib/types.ts:3-10` |
| Route `/login` | PASS | `app/login/page.tsx` |
| Route `/dashboard` | PASS | `app/dashboard/page.tsx` |
| Route `/dashboard/transactions` | PASS | `app/dashboard/transactions/page.tsx` |
| Route `/dashboard/requests` | PASS | `app/dashboard/requests/page.tsx` |
| Route `/dashboard/requests/[id]` | PASS | `app/dashboard/requests/[id]/page.tsx` |
| Route `/admin/review-queue` | PASS | `app/admin/review-queue/page.tsx` |
| No leftover `CLIENT` | PASS | Grep → 0 hits in code |
| No bare `ESCALATED` | PASS | Only `ESCALATED_HUMAN` (`lib/types.ts:10`) |
| No `/refunds` | PASS | Grep → 0 hits |
| No `/dashboard/admin` | PASS | Grep → 0 hits |
| `lib/simulator.ts` gone | PASS | Glob → file absent |

Notes:
- Doc drift: the AGENTS.md **Routes** list does not include
  `/dashboard/transactions`, yet the app implements it and this audit expects it.
  `AGENTS.md:29-35` vs `app/dashboard/transactions/page.tsx`.
- The only remaining "simulator" naming is a comment in `.env.example:1`

## 2. Data seam — **PASS** (10/10)

Rule: components/pages must never import `lib/mock-data.ts` or the store
directly; all access goes through `lib/api/*`.

| Check | Verdict | Evidence |
| --- | --- | --- |
| No component imports `lib/mock-data.ts` | PASS | Grep → only `lib/store.ts:8`, `lib/api/auth.ts:2`, `lib/api/finebrain.ts:3`, `lib/api/users.ts:2` |
| No component/page imports the store | PASS | Grep `@/lib/store` → only `lib/api/demo.ts:1`, `lib/api/finebrain.ts:2`, `lib/api/realtime.ts:1`, `lib/api/tickets.ts:2`, `lib/api/transactions.ts:2`, `lib/api/requests.ts:5` |
| Pages fetch through `lib/api/*` | PASS | `app/dashboard/page.tsx:14-16`, `transactions/page.tsx:6-7`, `requests/page.tsx:9`, `requests/[id]/page.tsx:16-17`, `review-queue/page.tsx:21-24` |
| Hooks fetch through `lib/api/*` | PASS | `hooks/use-refund-requests.ts:5`, `use-refund-request.ts:5-7`, `use-all-refund-requests.ts:5-9`; realtime via `lib/api/realtime.ts` |
| Demo toolbar uses the seam | PASS | `components/dashboard/demo-toolbar.tsx:19-25` imports `@/lib/api/auth`, `@/lib/api/demo`, `@/lib/api/finebrain` — not the store |
| Route handler uses the seam | PASS | `app/api/mock-auth/route.ts:3` imports `authenticate` from `lib/api/users`, not `mock-data` |

Note (allowed): `lib/api/auth.ts:2` imports `DEMO_PASSWORD` from
`lib/mock-data.ts`. It is inside `lib/api/*`, which the rule permits.

## 3. FineBrain — **PASS** (9/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| `lib/simulator.ts` is gone | PASS | Glob → absent |
| No timer drives status changes | PASS | Only timer is `lib/api/_shared.ts:3` (`delay()` latency); status changes live in `lib/api/requests.ts` / `lib/api/finebrain.ts` |
| `sendToFineBrain` payload matches spec | PASS | `lib/api/finebrain.ts:25-34,53-75` builds `type, request_id, reason, requested_amount, currency, customer{id,name,email}, transaction, created_at` |
| `applyBrainDecision` callback matches spec | PASS | `lib/api/finebrain.ts:36-42` (`request_id, status, confidence_score, decision_summary, timestamp`); status union `APPROVED, REJECTED, ESCALATED_HUMAN` at `:6` |
| Demo toolbar is the only caller of mock decisions | PASS | `applyBrainDecision` called only at `components/dashboard/demo-toolbar.tsx:104`. `sendToFineBrain` at `lib/api/requests.ts:66`; `executePayment` at `lib/api/requests.ts:107` (admin path) and `demo-toolbar.tsx:118` |
| Gated by `NEXT_PUBLIC_DEMO_MODE` | PASS | `demo-toolbar.tsx:28` reads the var; `:74` `if (!DEMO_MODE) return null;` |

Minor deviations (not failures):
- `transaction` is typed `FineBrainTransaction | null` (`finebrain.ts:32`)
  whereas the spec shows a non-null object.
- There is **no inbound webhook route**: the decision callback can only be
  applied from the demo toolbar. A real integration needs an endpoint that calls
  `applyBrainDecision` incoming (see §10).

## 4. State machine — **PASS** (9/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| Illegal transitions rejected | PASS | `lib/store.ts:23-31` (`COMPLETED: []`, `REJECTED: []`); gate `lib/store.ts:107-120` returns `false` when `canTransition` (`:33-39`) fails, e.g. `COMPLETED → PROCESSING`, `REJECTED → APPROVED` |
| One active refund per transaction | PASS | `lib/store.ts:156-166` throws `DUPLICATE_ACTIVE_REQUEST`; reinforced by `transaction.status !== "SUCCESS"` → `TRANSACTION_NOT_REFUNDABLE` (`:149-154`) |
| Refund amount cannot exceed transaction | PASS | `lib/store.ts:169-180` throws `INVALID_AMOUNT` / `AMOUNT_EXCEEDS_TRANSACTION` |
| Transition result honoured | PASS | `lib/api/finebrain.ts:99-104` and `lib/api/requests.ts:87-89` abort on a failed transition |

Caveat (not a failure): the store also exposes an **unchecked** `addRequest`
action (`lib/store.ts:56,86-87`) that bypasses all of the above guards. It is
currently unused (grep → definition only), but it is a latent hole if a future
caller reaches for it. Prefer removing it or routing it through
`createRefundRequest`.

## 5. Auth & access — **PARTIAL** (7/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| `middleware.ts` protects `/dashboard` | PASS | `middleware.ts:17-21`; matcher `:33-34` |
| Protects `/admin` | PASS | Same matcher; role gate `middleware.ts:23-28` |
| Customers cannot open `/admin/*` | PASS | `middleware.ts:23-28` redirect + `app/admin/review-queue/page.tsx:269-271` `notFound()` |
| Customers cannot open others' requests | PASS | `app/dashboard/requests/[id]/page.tsx:139-141` (`request.userId !== currentUser.id` → `notFound()`) |
| Session cookie is `httpOnly` | PASS | `app/api/mock-auth/route.ts:31-37` (`httpOnly: true`, `sameSite: "lax"`, `secure` in prod) |
| `/auth/callback` stub exists | PASS | `app/auth/callback/page.tsx:1-6` (returns `null`, TODO documented) |
| Logout clears the cookie | PASS | `app/api/mock-auth/route.ts:49-54` (`DELETE`), `lib/api/auth.ts:32-34`, `components/auth/logout-button.tsx:14-18` |
| Cookie integrity | **FAIL (mock-only, documented)** | `lib/session.ts:10-12` is `encodeURIComponent(JSON.stringify(user))` — **unsigned and forgeable**. `middleware.ts:6` trusts it for the role gate, so any client can hand-craft an `ADMIN` cookie and pass the `/admin` check. Explicitly flagged as mock-only in `lib/session.ts:3-5` |

Because the only route-level gate trusts an unsigned cookie, the "customers
cannot open /admin" guarantee is not real in this build. Acceptable for a demo;
must be signed/encrypted for production (see §10).

## 6. UI completeness — **PASS** (9/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| Loading states | PASS | `app/dashboard/page.tsx:179-193,226-231,312-317`; `transactions/page.tsx:244-249`; `requests/page.tsx:107-112`; `requests/[id]/page.tsx:89-97,110-112`; `review-queue/page.tsx:173-184,258-260` |
| Empty states | PASS | `EmptyState` at `dashboard/page.tsx:232-233,318-319`; `transactions/page.tsx:250-256`; `requests/page.tsx:113-116`; `review-queue/page.tsx:378-379`; timeline `activity-timeline.tsx:27-31` |
| Error states (boundaries + inline) | PASS | `app/error.tsx`, `app/global-error.tsx`, `app/dashboard/error.tsx`, `app/admin/error.tsx`, `app/not-found.tsx`; inline `ErrorState` (`components/ui/error-state.tsx`) at `dashboard/page.tsx:160-164`, `transactions/page.tsx:163-167`, `requests/page.tsx:105-106`, `requests/[id]/page.tsx:130-134`, `review-queue/page.tsx:281-291`. `load()` wrapped in `try/catch/finally` (`dashboard/page.tsx:79-100`, `transactions/page.tsx:67-86`) |
| Forms validate with zod | PASS | Login `app/login/page.tsx:22-25`; refund `components/dashboard/refund-modal.tsx:44-52`; reject `app/admin/review-queue/page.tsx:65-70` (trim, min 5) |
| No dead sidebar links | PASS | `components/dashboard/app-shell.tsx:32-50`; "Review Queue" shown only for `ADMIN`/`SUPPORT_AGENT`, matching `middleware.ts:23-24` |
| No forgotten placeholder text | PARTIAL | Two deliberate, labelled stubs remain: attachment uploads "aren't wired up yet" (`refund-modal.tsx:113-115`) and the FineBrain webhook note (`demo-toolbar.tsx:138-141`). Neither is an accidental placeholder, but the attachment feature is UI-only |

Minor: `notFound()` triggered inside the dashboard (missing request / cross-user)
renders the full-screen root `app/not-found.tsx` and drops the app shell — there
is no `app/dashboard/not-found.tsx`.

## 7. Code quality — **PARTIAL** (7/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| No `any` | PASS | Grep `any`, `as any`, `: any`, `<any>` → 0 hits |
| No `console.*` | PASS | Grep → 0 hits |
| No suppressions | PASS | Grep `@ts-ignore` / `@ts-expect-error` / `eslint-disable` → 0 hits |
| Consistent `StatusBadge` usage | PASS | `components/ui/status-badge.tsx` used at `dashboard/page.tsx:338`, `requests/page.tsx:141`, `requests/[id]/page.tsx:175`, `activity-timeline.tsx:54`; transactions use `TransactionStatusBadge` (`transactions/page.tsx:311`) |
| No unused code | **PARTIAL** | Unused exports remain: `getUser` (`lib/api/users.ts:21`), the store `addRequest` action (`lib/store.ts:56,86`), `ACTOR_LABELS` (`activity-timeline.tsx:8`, used only internally), and several exported-but-unused primitives (`DialogTrigger`, `DialogClose`, `SheetTrigger`, `SheetClose`, `SheetFooter`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `CardAction`, `CardFooter`) |
| No duplicated components/logic | **PARTIAL** | `StatCard` (`dashboard/page.tsx:38-60`) vs `MetricCard` (`review-queue/page.tsx:38-63`) are near-identical; the four error boundaries (`app/error.tsx`, `global-error.tsx`, `dashboard/error.tsx`, `admin/error.tsx`) repeat the same markup |
| Coherent error reporting | PASS | User-facing errors via `sonner` toasts; no stray logs |

## 8. Responsiveness & accessibility — **PASS** (9/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| 375 / 768 / 1280 px | PASS | Fluid grids (`dashboard/page.tsx:178`, `review-queue/page.tsx:348`); tables in `overflow-x-auto` (`dashboard/page.tsx:235`, `transactions/page.tsx:258`, `review-queue/page.tsx:380`); wide column hidden below `lg` (`review-queue/page.tsx:387`); mobile drawer `Sheet` (`app-shell.tsx:159-174`); sidebar `lg:pl-64` (`:176`) |
| Skip-to-content link | PASS | `app-shell.tsx:148-153` (`sr-only focus:not-sr-only` → `#main-content`); target `<main id="main-content">` at `:205` |
| Keyboard nav in modals | PASS | Radix `Dialog`/`Sheet` provide focus trap, Escape, scroll-lock; sr-only titles (`sheet.tsx:165-168`); close buttons with `<span class="sr-only">Close</span>` (`dialog.tsx:79`, `sheet.tsx:83`) |
| aria-labels on icon buttons | PASS | `app-shell.tsx:97,183`; `demo-toolbar.tsx:149,250`; `refund-modal.tsx:141`; `transactions/page.tsx:189,200,218-222` |
| Focus-visible rings | PASS | Global `button.tsx:7`; links/buttons carry `focus-visible:ring-2 focus-visible:ring-ring/60` (e.g. `app-shell.tsx:86,117`) |
| Color contrast on the dark theme | PASS | Foreground `#e2e8f0`, muted `#94a3b8`, accent `#3b82f6`, success `#10b981` on `#0b0f17` (`app/globals.css:54-71`) — AA for body text |

Minor: at 375 px the 6-column review-queue table requires horizontal scrolling
(functional, not broken). No explicit `viewport` metadata (`app/layout.tsx:17`)
— Next injects a sane default.

## 9. Persistence — **PASS** (10/10)

| Check | Verdict | Evidence |
| --- | --- | --- |
| State survives refresh | PASS | `zustand/middleware` `persist` to `localStorage` key `finebase-portal` (`lib/store.ts:222-236`) |
| Dates survive rehydration | PASS | Custom `reviver` restores ISO strings to `Date` (`lib/store.ts:225-229`, regex `:21`) |
| Reset Mock Data works | PASS | `resetMockData` re-seeds (`lib/store.ts:220`) via `lib/api/demo.ts:3-5`, wired to `demo-toolbar.tsx:90-95`, documented in `README.md:81-88` |
| Single source of events | PASS | Events live only in nested `request.events` (`lib/types.ts:67`); no duplicated flat `events` array (removed from `PortalData`/seed/`addEvent`/`createRefundRequest`/`partialize`) |

## 10. Backend-readiness — **PASS** (9/10)

Every location that must change for the real backend / FineBrain endpoint /
payment gateway / SSO:

| # | Location | Change required |
| --- | --- | --- |
| 1 | `lib/api/finebrain.ts:77` | **TODO** — POST `REFUND_EVALUATION_REQUEST` to the real FineBrain evaluate endpoint (via backend) |
| 2 | `lib/api/finebrain.ts:140` | **TODO** — call the real payment gateway in `executePayment` |
| 3 | `app/auth/callback/page.tsx:1` | **TODO** — SSO handoff: exchange the signed token for a session cookie |
| 4 | `lib/api/realtime.ts:6` | **TODO** — replace the store subscription with SSE/polling |
| 5 | `lib/api/demo.ts:4` | **TODO** — replace with a backend reset endpoint |
| 6 | *(missing)* | Add an **inbound** FineBrain decision webhook route that calls `applyBrainDecision` (`lib/api/finebrain.ts:86`) |
| 7 | `lib/api/auth.ts:4,14-34` | Replace `fetch("/api/mock-auth")` with real auth/SSO endpoints |
| 8 | `app/api/mock-auth/route.ts:1-54` | Delete; real auth replaces it. Cookie must become signed/encrypted |
| 9 | `lib/session.ts:10-12` | Sign (and ideally encrypt) the session payload; currently unsigned |
| 10 | `middleware.ts:6-28` | Verify a signed session/JWT instead of a decodable cookie |
| 11 | `lib/api/*` bodies | Swap store reads/writes for backend `fetch` calls (the documented seam — `README.md:29-39`); signatures stay |
| 12 | `lib/api/finebrain.ts:51` | `mockUsers` lookup for the customer block must come from the backend |
| 13 | `lib/store.ts`, `lib/mock-data.ts` | Remove once the backend owns state |
| 14 | `components/dashboard/demo-toolbar.tsx` + mounts (`app/dashboard/layout.tsx:14`, `app/admin/layout.tsx:10`) | Remove the mock simulator |
| 15 | `app/dashboard/page.tsx:84-88`, `transactions/page.tsx:72-75` | User scoping must be enforced **server-side** (the client already passes `userId`, but the backend must not trust it) |

---

## Scores

| # | Section | Score |
| --- | --- | --- |
| 1 | Conventions | **10 / 10** |
| 2 | Data seam | **10 / 10** |
| 3 | FineBrain | **9 / 10** |
| 4 | State machine | **9 / 10** |
| 5 | Auth & access | **7 / 10** |
| 6 | UI completeness | **9 / 10** |
| 7 | Code quality | **7 / 10** |
| 8 | Responsiveness & a11y | **9 / 10** |
| 9 | Persistence | **10 / 10** |
| 10 | Backend-readiness | **9 / 10** |
| | **Overall** | **89 / 100 (8.9 / 10)** |

## Prioritized fix list

### Critical
1. **Unsigned, forgeable session cookie.** `lib/session.ts:10-12` is plain
   URL-encoded JSON; `middleware.ts:6` trusts it for the role gate, so a
   hand-crafted `ADMIN` cookie bypasses `/admin`. Fine for the mock (noted at
   `lib/session.ts:3-5`), unacceptable once real users exist — sign/encrypt the
   payload and verify with a server secret.
2. **No inbound FineBrain decision endpoint.** `applyBrainDecision`
   (`lib/api/finebrain.ts:86`) is only reachable from the demo toolbar; the real
   webhook has no route. Add one that validates the callback and calls it.

### Medium
3. **Unchecked `addRequest` store action** (`lib/store.ts:56,86-87`) bypasses
   every domain guard (ownership, amount cap, duplicate-active). Remove it or
   validate inside it.
4. **Unused code** — `getUser` (`lib/api/users.ts:21`); exported-but-unused
   primitives (`DialogTrigger`, `DialogClose`, `SheetTrigger`, `SheetClose`,
   `SheetFooter`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `CardAction`,
   `CardFooter`); `ACTOR_LABELS` need not be exported
   (`components/dashboard/activity-timeline.tsx:8`).
5. **Attachment uploads are UI-only** (`components/dashboard/refund-modal.tsx:113-115`)
   — wire them or keep them clearly labelled as a demo affordance.
6. **`notFound()` drops the app shell** — add `app/dashboard/not-found.tsx` (and
   admin) so a missing/foreign request keeps the sidebar (`requests/[id]/page.tsx:141`,
   `review-queue/page.tsx:271`).
7. **Duplication** — merge `StatCard` (`dashboard/page.tsx:38-60`) and
   `MetricCard` (`review-queue/page.tsx:38-63`); extract the four near-identical
   error boundaries.
8. **Support-agent demo login is inconsistent** — the login page offers only
   Customer/Admin (`app/login/page.tsx:29-32`) though `demoAccounts.SUPPORT_AGENT`
   exists (`lib/api/auth.ts:9`) and the toolbar can switch to it
   (`demo-toolbar.tsx:182-192`); README (`:17-22,69`) omits Support Agent too.

### Low
9. **`transaction: FineBrainTransaction | null`** (`lib/api/finebrain.ts:32`)
   deviates from the spec's non-null object.
10. **Leftover "simulator" naming** in `.env.example:1` / `.env.local:1`.
11. **Doc drift** — AGENTS.md's Routes list omits `/dashboard/transactions`.
12. **No explicit `viewport`/`themeColor` metadata** (`app/layout.tsx:17`).
13. **Wide review-queue table scrolls horizontally at 375 px**
    (`app/admin/review-queue/page.tsx:380-471`).

## Summary

The portal is a clean, coherent mock that builds, lints and type-checks with no
errors. Every AGENTS.md naming and route convention is honoured, the
`lib/api/*` seam is respected (no component or page touches mock data or the
store), the FineBrain request/callback payloads match the documented shapes, no
timer drives the state machine, and the state machine itself correctly rejects
illegal transitions and enforces the duplicate-active and amount-cap rules. The
UI is complete — loading, empty and error states everywhere, zod-validated forms,
a skip-to-content link, labelled icon buttons and a faithful dark theme — and
persistence is solid with a single, non-duplicated event store.

The remaining gaps are concentrated in **security posture and dead code**, not
functionality. The session cookie is decodable and forgeable, so the role gate
in `middleware.ts` is advisory only in this build; the FineBrain decision
callback has no inbound endpoint; and a small set of unused exports plus two
duplicated UI patterns remain. None of these break the demo, but the cookie
signing and the inbound webhook are the two items that must land before real
users or a real FineBrain connection.

Recommended order: (1) sign the session cookie and verify it in middleware,
(2) add the inbound FineBrain webhook, then (3) remove the unchecked `addRequest`
and dead exports, and (4) tidy the duplication and doc drift.

**Overall score: 8.9 / 10.**
