# Development Setup

## Prerequisites

- Node.js 20+ (`node -v`)
- MySQL 8 / MariaDB 10 (XAMPP OK). Servers in this workspace are **OFF** by default —
  start MySQL/MariaDB first; **do not attempt app runs against a stopped server**.
- Git repo with `main` + `develop` branches pushed to origin; `package-lock.json`
  is tracked. `.env` is never committed (only `.env.example` with placeholders).

## 1. Environment

```powershell
Copy-Item .env.example .env
```

`.env` values (placeholders only in the example):

| Var | Default (code) | XAMPP note |
|---|---|---|
| `PORT` | `3000` (read from env in `server/config.ts`) | — |
| `DB_HOST` | `127.0.0.1` | usually fine |
| `DB_PORT` | `3308` | **XAMPP uses 3306 → set `DB_PORT=3306`** |
| `DB_USER` | `root` | usually fine |
| `DB_PASS` | empty | set if your root has a password |
| `DB_NAME` | `soletrack_node` | auto-created on boot |

## 2. Install / run / build

```powershell
npm install     # package-lock.json is tracked; changes only via npm install/uninstall
npm run dev     # tsx server.ts → :3000, bootstraps DB + seeds (safe to re-run; seed is idempotent-ish)
npm run lint    # tsc --noEmit
npm run build   # vite build + esbuild server → dist/
npm start       # node dist/server.cjs (set NODE_ENV=production for static-file mode)
```

Seed logins: [`ACCOUNTS.md`](../ACCOUNTS.md) (dev-only weak passwords).

## 3. PWA assets (optional)

```powershell
node scripts/generate-icons.mjs       # public/pwa-*.png from public/icon-source.svg
node scripts/generate-screenshots.mjs  # public/screenshot-*.png
```

Requires `sharp` (already a dependency).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:3308` | DB server off, or wrong port. Start MySQL; XAMPP → `DB_PORT=3306`. |
| `ER_ACCESS_DENIED` | Wrong `DB_USER`/`DB_PASS`; set in `.env`. |
| Port 3000 in use | Set `PORT` in `.env` or stop the other process. |
| `tsc --noEmit` "no config" | Fixed — `tsconfig.json` committed. Re-run `npm run lint`. |
| `rm -rf` / `set NODE_ENV` errors | Fixed — `clean`/`start` are cross-platform now. |
| Stale catalog data in browser | Catalog APIs use `NetworkFirst` (10s timeout, cache fallback offline) — hard-refresh / clear SW cache if testing older builds. |
| `LIMIT ?` query error | Fixed — client `limit` is validated + inlined (`server/utils.ts`). If it still errors against your DB version, report it. |
