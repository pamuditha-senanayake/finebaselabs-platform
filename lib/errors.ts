export type RefundErrorCode =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_NOT_OWNED"
  | "TRANSACTION_NOT_REFUNDABLE"
  | "DUPLICATE_ACTIVE_REQUEST"
  | "INVALID_AMOUNT"
  | "AMOUNT_EXCEEDS_TRANSACTION"
  | "PRODUCT_NOT_REFUNDABLE"
  | "REFUND_WINDOW_EXPIRED"
  | "REFUND_LIMIT_REACHED";

export class RefundError extends Error {
  readonly code: RefundErrorCode;

  constructor(code: RefundErrorCode, message: string) {
    super(message);
    this.name = "RefundError";
    this.code = code;
  }
}

export type CommerceErrorCode =
  | "EMPTY_CART"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "SLUG_TAKEN"
  | "OUT_OF_STOCK"
  | "INVALID_QUANTITY"
  | "CURRENCY_MISMATCH"
  | "PAYMENT_FAILED";

export class CommerceError extends Error {
  readonly code: CommerceErrorCode;

  constructor(code: CommerceErrorCode, message: string) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
  }
}
