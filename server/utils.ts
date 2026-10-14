import type { NextFunction, Request, RequestHandler, Response } from "express";
import { MAX_LIST_LIMIT } from "./config";

/** Generic DB row (unknown values; narrow at use sites). */
export type Row = Record<string, unknown>;

/** Wrap async route handlers so rejections go to the central error middleware
 *  as JSON { status: "error" } instead of hanging the request. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Central error middleware — always JSON, never leaks secrets. */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error("Unhandled API error:", err instanceof Error ? err.message : "unknown");
  const status = typeof (err as { status?: unknown })?.status === "number"
    ? ((err as { status: number }).status as number)
    : 500;
  res.status(status).json({ status: "error", message: "Internal server error" });
}

/**
 * Validate a client-supplied LIMIT and return a safe integer, or undefined
 * when absent. The caller must INLINE the returned number into the SQL string
 * (mysql2 cannot bind LIMIT via execute() placeholders).
 */
export function parseListLimit(raw: unknown, max: number = MAX_LIST_LIMIT): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || Math.floor(n) <= 0) return undefined;
  return Math.min(Math.floor(n), max);
}

/** Validate the seller-reports `days` window. Preserves the old default of 7. */
export function parseDays(raw: unknown, fallback = 7, max = 365): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || Math.floor(n) <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/**
 * Validate a client-supplied integer ID (query/route param).
 * Accepts only strings matching /^\d+$/ with value > 0, else null.
 * Callers must return 400 { status: "error", message: "Invalid ID" } on null.
 */
export function parseId(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return parseId(raw[0]);
  }
  let s: string;
  if (typeof raw === "number") {
    if (!Number.isInteger(raw)) return null;
    s = String(raw);
  } else if (typeof raw === "string") {
    s = raw.trim();
  } else {
    s = String(raw).trim();
  }
  if (!/^\d+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

/** Shared email pattern for admin/seller validation. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when a mysql2 error is a duplicate-key violation. */
export function isDupEntry(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return code === "ER_DUP_ENTRY";
}

/** True when a mysql2 error is a missing FK reference. */
export function isNoRefRow(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return (
    code === "ER_NO_REFERENCED_ROW" ||
    code === "ER_NO_REFERENCED_ROW_2" ||
    code === "ER_NO_REFERENCED_ROW_21"
  );
}

/**
 * Map a caught DB error to a safe HTTP status + message.
 * Never echoes err.message (may contain SQL text).
 */
export function mapDbError(err: unknown, fallback = "Database error"): { http: number; message: string } {
  if (isDupEntry(err)) return { http: 409, message: "Already exists" };
  if (isNoRefRow(err)) return { http: 400, message: "Invalid reference" };
  void fallback;
  return { http: 400, message: fallback };
}
