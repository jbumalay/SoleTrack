import type { Express } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getPool } from "../db";
import { SESSION_TTL_MS } from "../config";
import { getAuthenticatedUser } from "../auth";
import { asyncHandler, mapDbError } from "../utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Registration may only create customer/seller accounts — never admin. */
const ALLOWED_REGISTER_ROLES = new Set(["customer", "seller"]);

export function registerAuthRoutes(app: Express): void {
  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      // req.body is unvalidated JSON: fields stay `any` (Express default) and are
      // validated below before any DB use.
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        res.status(400).json({ status: "error", message: "Email and password are required" });
        return;
      }
      const pool = getPool();
      await pool.execute("DELETE FROM sessions WHERE expires_at < NOW()");
      const [rows] = (await pool.execute("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL", [
        email,
      ])) as unknown as [Array<Record<string, unknown>>, unknown];
      const user = rows[0] as
        | (Record<string, unknown> & { password_hash: string; user_id: number })
        | undefined;

      if (user && (await bcrypt.compare(String(password), user.password_hash))) {
        // NOTE: sellers with status pending_approval are intentionally allowed
        // to log in so they can see their approval state; the isSeller gate
        // still blocks all seller APIs until an admin activates them.
        const { password_hash: _omitted, ...userInfo } = user;
        void _omitted;
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS); // 24 hours
        await pool.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [
          token,
          user.user_id,
          expiresAt,
        ]);
        res.json({ status: "success", data: { ...userInfo, token } });
      } else {
        res.status(401).json({ status: "error", message: "Invalid email or password" });
      }
    })
  );

  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      // Unvalidated JSON body (`any`); every field is validated below.
      const { email, password, role, first_name, last_name, brand_name } = req.body ?? {};

      if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 255) {
        res.status(400).json({ status: "error", message: "Invalid email address" });
        return;
      }
      // Guard missing password BEFORE the length check (original crashed on undefined).
      if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ status: "error", message: "Heritage key must be at least 8 characters" });
        return;
      }
      const requestedRole = role === undefined || role === null || role === "" ? "customer" : String(role);
      if (!ALLOWED_REGISTER_ROLES.has(requestedRole)) {
        res.status(400).json({ status: "error", message: "Invalid role" });
        return;
      }
      if (first_name !== undefined && first_name !== null && String(first_name).length > 50) {
        res.status(400).json({ status: "error", message: "First name is too long" });
        return;
      }
      if (last_name !== undefined && last_name !== null && String(last_name).length > 50) {
        res.status(400).json({ status: "error", message: "Last name is too long" });
        return;
      }
      if (brand_name !== undefined && brand_name !== null && String(brand_name).length > 255) {
        res.status(400).json({ status: "error", message: "Brand name is too long" });
        return;
      }

      try {
        const pool = getPool();
        const username = String(email).split("@")[0] + "_" + Math.floor(Math.random() * 1000);
        const hash = await bcrypt.hash(String(password), 10);

        // Sellers register as pending_approval; customers are active immediately.
        const status = requestedRole === "seller" ? "pending_approval" : "active";

        const [result] = (await pool.execute(
          "INSERT INTO users (username, email, password_hash, role, first_name, last_name, brand_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            username,
            email,
            hash,
            requestedRole,
            first_name || null,
            last_name || null,
            brand_name || null,
            status,
          ]
        )) as unknown as [{ insertId: number }, unknown];
        const insertId = result.insertId;

        const [userRows] = (await pool.execute("SELECT * FROM users WHERE user_id = ?", [
          insertId,
        ])) as unknown as [Array<Record<string, unknown>>, unknown];
        const user = userRows[0];
        const { password_hash: _omitted, ...userInfo } = user;
        void _omitted;

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS); // 24 hours
        await pool.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [
          token,
          (user as { user_id: number }).user_id,
          expiresAt,
        ]);

        res.json({ status: "success", data: { ...userInfo, token } });
      } catch (error: unknown) {
        console.error("Registration failed");
        const mapped = mapDbError(error, "Registration failed");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      }
    })
  );

  app.get(
    "/api/auth/me",
    asyncHandler(async (req, res) => {
      const user = await getAuthenticatedUser(req);
      if (user) {
        const { password_hash: _omitted, ...userInfo } = user;
        void _omitted;
        res.json({ status: "success", data: userInfo });
        return;
      }
      res.status(401).json({ status: "error", message: "Not logged in" });
    })
  );

  app.post(
    "/api/auth/logout",
    asyncHandler(async (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (token) await getPool().execute("DELETE FROM sessions WHERE token = ?", [token]);
      }
      res.json({ status: "success", message: "Logged out" });
    })
  );
}
