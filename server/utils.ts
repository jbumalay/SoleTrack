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
