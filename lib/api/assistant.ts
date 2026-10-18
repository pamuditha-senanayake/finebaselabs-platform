import { listProducts } from "@/lib/api/products";
import { listTransactions } from "@/lib/api/transactions";
import { formatCurrency, formatDate } from "@/lib/format";

const SUPPORT_HOURS =
  "Support is available Monday–Friday, 9:00–18:00 ET. Outside those hours you can still submit refund requests — they are reviewed automatically as soon as they come in.";

// TODO: replace with a real FineBrain chat endpoint call, proxied through the
// backend. The portal never talks to FineBrain directly.
export async function askAssistant(
  userId: string,
  message: string,
): Promise<string> {
  await wait(700 + Math.random() * 900);

  const query = message.toLowerCase();

  if (/refund window|return window|how long.*refund/.test(query)) {
    const products = await listProducts();

    if (products.length === 0) {
      return "I couldn't find any products in the store right now. Each product page lists its refund window when purchases are available.";
    }

    const lines = products.map(
      (product) =>
        `• ${product.name}: ${
          product.refundable
            ? `${product.refundWindowDays}-day refund window`
            : "not refundable"
        }`,
    );

    return `Here are the current refund windows:\n${lines.join("\n")}\n\nYou can review the details on each product's store page.`;
  }

  if (/where is my order|order status|track.*order|my order|purchase.*status/.test(query)) {
    const transactions = await listTransactions(userId);
    const latest = transactions[0];

    if (!latest) {
      return "I don't see any purchases on your account yet. Once you buy something from the store, you can track it here and on the Purchases page.";
    }

    return `Your most recent purchase is "${latest.description}" (${latest.reference}), placed on ${formatDate(latest.createdAt)} for ${formatCurrency(latest.amount, latest.currency)}. Its status is ${latest.status.toLowerCase().replaceAll("_", " ")}. The full history is on the Purchases page.`;
  }

  if (/support hours|when.*support|are you (open|available)|contact.*support/.test(query)) {
    return SUPPORT_HOURS;
  }

  if (/request a refund|how do i.*refund|get a refund|start a refund|refund my/.test(query)) {
    return 'To request a refund, open the Purchases page, find the charge, and select "Request refund". Most requests are reviewed automatically right away; anything that needs a closer look goes to a specialist. You can follow progress under Refund Requests.';
  }

  return "I can help with purchases, refund windows, order status, and refund requests. Try one of the suggested questions, or open the Purchases page for your full history.";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
