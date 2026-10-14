import type { Express } from "express";
import { getPool } from "../db";
import { asyncHandler, parseId, parseListLimit, parsePage, type Row } from "../utils";

const CATALOG_SORTS = new Set(["newest", "price_asc", "price_desc", "rating"]);
const DEFAULT_PAGED_LIMIT = 12;

export function registerPublicRoutes(app: Express): void {
  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      res.json({ status: "success", message: "API is healthy" });
    })
  );

  app.get(
    "/api/products",
    asyncHandler(async (req, res) => {
      const pool = getPool();
      const { category, limit, id, seller_id, search, sort, page } = req.query;

      if (id !== undefined && id !== "") {
        const pid = parseId(id);
        if (pid === null) {
          res.status(400).json({ status: "error", message: "Invalid ID" });
          return;
        }
        const [productRows] = (await pool.execute(
          `
          SELECT p.*, c.category_name, u.brand_name,
                  (SELECT SUM(stock_quantity) FROM inventory WHERE product_id = p.product_id) as total_stock,
                  (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as average_rating,
                  (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as total_reviews
          FROM products p
          JOIN categories c ON p.category_id = c.category_id
          JOIN users u ON p.seller_id = u.user_id
          WHERE p.product_id = ? AND p.deleted_at IS NULL
        `,
          [pid]
        )) as unknown as [Row[], unknown];

        const product = productRows[0] as (Row & { reviews?: Row[]; inventory?: Row[] }) | undefined;
        if (product) {
          const [reviews] = (await pool.execute(
            "SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC",
            [pid]
          )) as unknown as [Row[], unknown];
          const [inventory] = (await pool.execute(
            `
            SELECT i.*, s.size_value
            FROM inventory i
            JOIN sizes s ON i.size_id = s.size_id
            WHERE i.product_id = ? AND i.deleted_at IS NULL
          `,
            [pid]
          )) as unknown as [Row[], unknown];
          product.reviews = reviews;
          product.inventory = inventory;
          res.json({ status: "success", data: product });
          return;
        }
        res.status(404).json({ status: "error", message: "Product not found" });
        return;
      }

      const searchStr =
        search === undefined || search === null ? "" : String(search).trim();
      const sortStr = sort === undefined || sort === null ? "" : String(sort).trim();
      const searchPresent = searchStr !== "";
      const sortPresent = sortStr !== "";
      const pageSent = page !== undefined && page !== "";
      const limitSent = limit !== undefined && limit !== "";

      if (sortPresent && !CATALOG_SORTS.has(sortStr)) {
        res.status(400).json({ status: "error", message: "Invalid sort" });
        return;
      }

      let safePage: number | undefined;
      if (pageSent) {
        safePage = parsePage(page);
        if (safePage === undefined) {
          res.status(400).json({ status: "error", message: "Invalid page" });
          return;
        }
      }

      let safeLimit: number | undefined;
      if (limitSent) {
        // mysql2 cannot bind LIMIT via execute() placeholders, so validate the
        // client value as an int, clamp to MAX_LIST_LIMIT, and inline it.
        safeLimit = parseListLimit(limit);
        if (safeLimit === undefined) {
          res.status(400).json({ status: "error", message: "Invalid limit" });
          return;
        }
      }

      // Paged envelope only when a catalog-mode param is sent. `limit` alone
      // keeps the legacy bare-array shape so existing callers are unaffected.
      const isPaged = searchPresent || sortPresent || pageSent;

      let where = `WHERE p.status = 'active' AND p.deleted_at IS NULL`;
      const params: Array<string | number> = [];

      if (category && category !== "All") {
        where += " AND c.category_name = ?";
        params.push(String(category));
      }

      if (seller_id !== undefined && seller_id !== "") {
        const sid = parseId(seller_id);
        if (sid === null) {
          res.status(400).json({ status: "error", message: "Invalid seller_id" });
          return;
        }
        where += " AND p.seller_id = ?";
        params.push(sid);
      }

      if (searchPresent) {
        where += " AND (p.product_name LIKE ? OR p.description LIKE ? OR u.brand_name LIKE ?)";
        const like = `%${searchStr}%`;
        params.push(like, like, like);
      }

      const selectList = `
        SELECT p.*, c.category_name, u.brand_name,
                (SELECT SUM(stock_quantity) FROM inventory WHERE product_id = p.product_id) as total_stock,
                (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as average_rating,
                (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as total_reviews
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN users u ON p.seller_id = u.user_id
      `;

      if (isPaged) {
        const effectiveLimit = safeLimit ?? DEFAULT_PAGED_LIMIT;
        const effectivePage = safePage ?? 1;

        let orderBy = " ORDER BY p.created_at DESC";
        if (sortStr === "price_asc") orderBy = " ORDER BY p.base_price ASC";
        else if (sortStr === "price_desc") orderBy = " ORDER BY p.base_price DESC";
        else if (sortStr === "rating") orderBy = " ORDER BY average_rating DESC, p.created_at DESC";

        const [countRows] = (await pool.execute(
          `SELECT COUNT(*) as count FROM products p
           JOIN categories c ON p.category_id = c.category_id
           JOIN users u ON p.seller_id = u.user_id
           ${where}`,
          params
        )) as unknown as [[{ count: number }], unknown];
        const totalItems = Number(countRows[0]?.count ?? 0) || 0;
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / effectiveLimit);
        const offset = (effectivePage - 1) * effectiveLimit;

        const [products] = (await pool.execute(
          `${selectList} ${where}${orderBy} LIMIT ${effectiveLimit} OFFSET ${offset}`,
          params
        )) as unknown as [Row[], unknown];
        res.json({
          status: "success",
          data: { items: products, page: effectivePage, total_pages: totalPages, total_items: totalItems },
        });
        return;
      }

      let query = `${selectList} ${where} ORDER BY p.created_at DESC`;
      if (safeLimit !== undefined) {
        query += ` LIMIT ${safeLimit}`;
      }

      const [products] = (await pool.execute(query, params)) as unknown as [Row[], unknown];
      res.json({ status: "success", data: products });
    })
  );

  app.get(
    "/api/categories",
    asyncHandler(async (_req, res) => {
      const [categories] = (await getPool().execute(
        "SELECT * FROM categories"
      )) as unknown as [Row[], unknown];
      res.json({ status: "success", data: categories });
    })
  );

  app.get(
    "/api/sizes",
    asyncHandler(async (_req, res) => {
      const [sizes] = (await getPool().execute(
        "SELECT * FROM sizes ORDER BY size_id ASC"
      )) as unknown as [Row[], unknown];
      res.json({ status: "success", data: sizes });
    })
  );

  app.get(
    "/api/stores",
    asyncHandler(async (req, res) => {
      const { search, page, limit } = req.query;
      const searchStr =
        search === undefined || search === null ? "" : String(search).trim();
      const searchPresent = searchStr !== "";
      const pageSent = page !== undefined && page !== "";
      const limitSent = limit !== undefined && limit !== "";
      const isPaged = searchPresent || pageSent || limitSent;

      if (!isPaged) {
        const [rows] = (await getPool().execute(`
          SELECT u.user_id, u.username, u.brand_name, u.first_name, u.last_name,
                 sp.description, sp.logo_url, sp.banner_url, sp.location,
                 (SELECT COUNT(*) FROM products WHERE seller_id = u.user_id AND deleted_at IS NULL) as product_count
          FROM users u
          LEFT JOIN seller_profiles sp ON u.user_id = sp.seller_id
          WHERE u.role = 'seller' AND u.status = 'active' AND u.deleted_at IS NULL
          ORDER BY u.brand_name ASC
        `)) as unknown as [Row[], unknown];
        res.json({ status: "success", data: rows });
        return;
      }

      let safePage: number | undefined;
      if (pageSent) {
        safePage = parsePage(page);
        if (safePage === undefined) {
          res.status(400).json({ status: "error", message: "Invalid page" });
          return;
        }
      }
      let safeLimit: number | undefined;
      if (limitSent) {
        safeLimit = parseListLimit(limit);
        if (safeLimit === undefined) {
          res.status(400).json({ status: "error", message: "Invalid limit" });
          return;
        }
      }
      const effectiveLimit = safeLimit ?? DEFAULT_PAGED_LIMIT;
      const effectivePage = safePage ?? 1;

      let where = `WHERE u.role = 'seller' AND u.status = 'active' AND u.deleted_at IS NULL`;
      const params: Array<string | number> = [];
      if (searchPresent) {
        where += ` AND (u.brand_name LIKE ? OR u.username LIKE ? OR sp.description LIKE ? OR sp.location LIKE ?)`;
        const like = `%${searchStr}%`;
        params.push(like, like, like, like);
      }

      const from = `FROM users u LEFT JOIN seller_profiles sp ON u.user_id = sp.seller_id`;
      const [countRows] = (await getPool().execute(
        `SELECT COUNT(*) as count ${from} ${where}`,
        params
      )) as unknown as [[{ count: number }], unknown];
      const totalItems = Number(countRows[0]?.count ?? 0) || 0;
      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / effectiveLimit);
      const offset = (effectivePage - 1) * effectiveLimit;

      const [rows] = (await getPool().execute(
        `SELECT u.user_id, u.username, u.brand_name, u.first_name, u.last_name,
                sp.description, sp.logo_url, sp.banner_url, sp.location,
                (SELECT COUNT(*) FROM products WHERE seller_id = u.user_id AND deleted_at IS NULL) as product_count
         ${from} ${where}
         ORDER BY u.brand_name ASC
         LIMIT ${effectiveLimit} OFFSET ${offset}`,
        params
      )) as unknown as [Row[], unknown];
      res.json({
        status: "success",
        data: { items: rows, page: effectivePage, total_pages: totalPages, total_items: totalItems },
      });
    })
  );

  app.get(
    "/api/stores/:id",
    asyncHandler(async (req, res) => {
      const pool = getPool();
      const storeId = parseId(req.params.id);
      if (storeId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const [userRows] = (await pool.execute(
        `
        SELECT u.user_id, u.username, u.brand_name, u.first_name, u.last_name,
               sp.description, sp.logo_url, sp.banner_url, sp.location, sp.contact_email, sp.phone
        FROM users u
        LEFT JOIN seller_profiles sp ON u.user_id = sp.seller_id
        WHERE u.user_id = ? AND u.role = 'seller' AND u.deleted_at IS NULL
      `,
        [storeId]
      )) as unknown as [Row[], unknown];

      if (userRows.length === 0) {
        res.status(404).json({ status: "error", message: "Store not found" });
        return;
      }

      const [products] = (await pool.execute(
        `
        SELECT p.*, c.category_name,
               (SELECT SUM(stock_quantity) FROM inventory WHERE product_id = p.product_id) as total_stock,
               (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as average_rating,
               (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as total_reviews
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        WHERE p.seller_id = ? AND p.status = 'active' AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `,
        [storeId]
      )) as unknown as [Row[], unknown];

      res.json({ status: "success", data: { ...userRows[0], products } });
    })
  );
}
