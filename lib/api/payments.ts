import { delay } from "@/lib/api/_shared";

export interface PaymentRequest {
  amount: number;
  currency: string;
}

export type PaymentResult =
  | { ok: true; reference: string }
  | { ok: false; reason: string };

// Mock payment step. Checkout never collects or stores card data; this only
// simulates a gateway confirmation.
// TODO: replace with a hosted checkout (Stripe / PayPal) via the backend.
export async function processPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  await delay(400);

  const reference = `MOCKPAY-${request.currency}-${request.amount
    .toString(36)
    .toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  return { ok: true, reference };
}
