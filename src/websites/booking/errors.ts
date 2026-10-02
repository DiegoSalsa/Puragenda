export type ErrorCode = "VALIDATION" | "CONFIGURATION" | "CAPABILITY_MISSING" | "NETWORK" | "TIMEOUT" | "CONFLICT" | "RATE_LIMIT" | "ORIGIN" | "UNCERTAIN" | "UPSTREAM";
export class BookingError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode, message: string, status = 400) {
    super(message);
    this.name = "BookingError";
    this.code = code;
    this.status = status;
  }
}
export function safeError(error: unknown): BookingError {
  return error instanceof BookingError ? error : new BookingError("UPSTREAM", "No pudimos consultar la agenda. Inténtalo de nuevo.", 502);
}
