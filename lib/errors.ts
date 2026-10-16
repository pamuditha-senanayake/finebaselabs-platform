export type RefundErrorCode =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_NOT_OWNED"
  | "TRANSACTION_NOT_REFUNDABLE"
  | "DUPLICATE_ACTIVE_REQUEST"
  | "INVALID_AMOUNT"
  | "AMOUNT_EXCEEDS_TRANSACTION";

export class RefundError extends Error {
  readonly code: RefundErrorCode;

  constructor(code: RefundErrorCode, message: string) {
    super(message);
    this.name = "RefundError";
    this.code = code;
  }
}
