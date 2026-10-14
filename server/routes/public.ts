import type { Express } from "express";
import { getPool } from "../db";
import { asyncHandler, parseId, parseListLimit, type Row } from "../utils";

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
      const { category, limit, id, seller_id } = req.query;

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

      let query = `
        SELECT p.*, c.category_name, u.brand_name,
                (SELECT SUM(stock_quantity) FROM inventory WHERE product_id = p.product_id) as total_stock,
                (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as average_rating,
                (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as total_reviews
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN users u ON p.seller_id = u.user_id
        WHERE p.status = 'active' AND p.deleted_at IS NULL
      `;
      const params: Array<string | number> = [];

      if (category && category !== "All") {
        query += " AND c.category_name = ?";
        params.push(String(category));
      }

      if (seller_id !== undefined && seller_id !== "") {
        const sid = parseId(seller_id);
        if (sid === null) {
          res.status(400).json({ status: "error", message: "Invalid seller_id" });
          return;
        }
        query += " AND p.seller_id = ?";
        params.push(sid);
      }

      query += " ORDER BY p.created_at DESC";

      if (limit !== undefined && limit !== "") {
        // mysql2 cannot bind LIMIT via execute() placeholders, so validate the
        // client value as an int, clamp to MAX_LIST_LIMIT, and inline it.
        const safeLimit = parseListLimit(limit);
        if (safeLimit === undefined) {
          res.status(400).json({ status: "error", message: "Invalid limit" });
          return;
        }
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
    asyncHandler(async (_req, res) => {
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
