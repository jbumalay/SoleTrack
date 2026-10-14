import "dotenv/config";

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: numEnv("PORT", 3000),
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: numEnv("DB_PORT", 3308),
  dbUser: process.env.DB_USER || "root",
  // No hardcoded secrets: empty-string default preserves local XAMPP behavior;
  // set DB_PASS in the environment for anything non-local.
  dbPass: process.env.DB_PASS ?? "",
  dbName: process.env.DB_NAME || "soletrack_node",
  nodeEnv: process.env.NODE_ENV || "development",
};

// Business constants (kept in sync with src/constants.ts).
export const SHIPPING_THRESHOLD = 500;
export const SHIPPING_FEE = 50;
export const LOW_STOCK_THRESHOLD = 30;

/** Upper bound for client-controlled LIMIT clauses (inlined after validation). */
export const MAX_LIST_LIMIT = 100;

/** Bearer-token session lifetime. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
