import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getPool } from "./db";
import type { Row } from "./utils";

export interface AuthUser extends Row {
  user_id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  brand_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export type AuthedRequest = Request & { user?: AuthUser };

/**
 * Resolve the Bearer token (Authorization: Bearer <token>) to a user via the
 * sessions table. Returns null for missing/expired/unknown tokens.
 * Logs contain no tokens or other secrets.
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const pool = getPool();
    const [sessionRows] = (await pool.execute(
      "SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()",
      [token]
    )) as unknown as [Array<{ user_id: number }>, unknown];
    if (sessionRows.length === 0) return null;
    const [userRows] = (await pool.execute(
      "SELECT * FROM users WHERE user_id = ? AND deleted_at IS NULL",
      [sessionRows[0].user_id]
    )) as unknown as [AuthUser[], unknown];
    if (userRows.length === 0) return null;
    return userRows[0];
  } catch {
    // Minimal logging: no tokens, no user data.
    console.error("Auth check failed");
    return null;
  }
}

/** Require any logged-in user. Attaches req.user. 401 message preserved. */
export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Login required" });
      return;
    }
    if (user.status !== "active") {
      res.status(403).json({ status: "error", message: "Account inactive" });
      return;
    }
    (req as AuthedRequest).user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const isSeller: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    if (user && user.role === "seller" && user.status === "active") {
      (req as AuthedRequest).user = user;
      next();
    } else {
      res.status(403).json({ status: "error", message: "Seller access required (and must be active)" });
    }
  } catch (err) {
    next(err);
  }
};

export const isAdmin: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getAuthenticatedUser(req);
    if (user && user.status !== "active") {
      res.status(403).json({ status: "error", message: "Account inactive" });
      return;
    }
    if (user && user.role === "admin") {
      (req as AuthedRequest).user = user;
      next();
    } else {
      res.status(403).json({ status: "error", message: "Admin access required" });
    }
  } catch (err) {
    next(err);
  }
};
