import type { Express } from "express";
import bcrypt from "bcryptjs";
import { getPool } from "../db";
import { isAdmin, type AuthedRequest } from "../auth";
import { asyncHandler, type Row } from "../utils";

export function registerAdminRoutes(app: Express): void {
  app.get(
    "/api/analytics/stats",
    isAdmin,
    asyncHandler(async (_req, res) => {
      const pool = getPool();
      const [salesRows] = (await pool.execute(
        "SELECT CAST(SUM(total_amount) AS DOUBLE) as total FROM orders"
      )) as unknown as [Array<{ total: number | null }>, unknown];
      const [ordersRows] = (await pool.execute(
        "SELECT COUNT(*) as count FROM orders"
      )) as unknown as [Array<{ count: number }>, unknown];
      const [customersRows] = (await pool.execute(
        "SELECT COUNT(*) as count FROM users WHERE role = 'customer'"
      )) as unknown as [Array<{ count: number }>, unknown];
      const [productsRows] = (await pool.execute(
        "SELECT COUNT(*) as count FROM products"
      )) as unknown as [Array<{ count: number }>, unknown];

      res.json({
        status: "success",
        data: {
          total_sales: salesRows[0].total || 0,
          total_orders: ordersRows[0].count || 0,
          total_customers: customersRows[0].count || 0,
          total_products: productsRows[0].count || 0,
        },
      });
    })
  );

  app.get(
    "/api/admin/dashboard",
    isAdmin,
    asyncHandler(async (_req, res) => {
      try {
        const pool = getPool();
        const [userStats] = (await pool.execute(`
          SELECT
            COUNT(*) as total_users,
            SUM(status = 'active') as active_users,
            SUM(role = 'seller') as seller_count,
            SUM(role = 'customer') as customer_count,
            SUM(status = 'pending_approval' AND role = 'seller') as pending_approvals
          FROM users
          WHERE deleted_at IS NULL
        `)) as unknown as [Row[], unknown];

        const [orderStats] = (await pool.execute(
          "SELECT COUNT(*) as total_orders, CAST(SUM(total_amount) AS DOUBLE) as total_revenue FROM orders"
        )) as unknown as [Row[], unknown];
        const [productStats] = (await pool.execute(
          "SELECT COUNT(*) as total_products FROM products WHERE deleted_at IS NULL"
        )) as unknown as [Row[], unknown];

        const [recentOrders] = (await pool.execute(`
          SELECT o.order_id, o.total_amount, o.status, o.created_at, u.first_name, u.last_name
          FROM orders o
          JOIN users u ON o.user_id = u.user_id
          ORDER BY o.created_at DESC
          LIMIT 5
        `)) as unknown as [Row[], unknown];

        res.json({
          status: "success",
          data: {
            ...userStats[0],
            ...orderStats[0],
            ...productStats[0],
            recent_orders: recentOrders,
          },
        });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to load dashboard" });
      }
    })
  );

  app.get(
    "/api/admin/users",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { search, role, status } = req.query;
      let query =
        "SELECT user_id, username, email, first_name, last_name, brand_name, role, status, created_at FROM users WHERE deleted_at IS NULL";
      const params: Array<string | number> = [];

      if (search) {
        query += " AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR brand_name LIKE ?)";
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }
      if (role) {
        query += " AND role = ?";
        params.push(String(role));
      }
      if (status) {
        query += " AND status = ?";
        params.push(String(status));
      }

      query += " ORDER BY created_at DESC";

      try {
        const [users] = (await getPool().execute(query, params)) as unknown as [Row[], unknown];
        res.json({ status: "success", data: users });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to load users" });
      }
    })
  );

  app.post(
    "/api/admin/users",
    isAdmin,
    asyncHandler(async (req, res) => {
      // Unvalidated JSON body (`any`); validated/coerced below.
      const { email, password, role, first_name, last_name, brand_name, status } = req.body ?? {};
      try {
        if (!password || String(password).length < 8) {
          res.status(400).json({ status: "error", message: "Password must be at least 8 characters" });
          return;
        }
        const hash = await bcrypt.hash(String(password), 10);
        // Admin-created users keep the original behavior (any role allowed here —
        // admin privilege is already enforced by isAdmin; self-registration is
        // what blocks the admin role).
        const username = String(email).split("@")[0] + "_" + Math.floor(Math.random() * 1000);
        await getPool().execute(
          "INSERT INTO users (username, email, password_hash, role, first_name, last_name, brand_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [username, email, hash, role, first_name, last_name, brand_name || null, status || "active"]
        );
        res.json({ status: "success", message: "User created by admin" });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to create user" });
      }
    })
  );

  app.put(
    "/api/admin/users/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      // Unvalidated JSON body (`any`).
      const { role, status, first_name, last_name, brand_name } = req.body ?? {};
      try {
        await getPool().execute(
          "UPDATE users SET role = ?, status = ?, first_name = ?, last_name = ?, brand_name = ? WHERE user_id = ?",
          [role, status, first_name, last_name, brand_name, id]
        );
        res.json({ status: "success", message: "User updated" });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to update user" });
      }
    })
  );

  app.delete(
    "/api/admin/users/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const admin = (req as AuthedRequest).user!;
      if (Number(id) === admin.user_id) {
        res.status(400).json({ status: "error", message: "Cannot delete yourself" });
        return;
      }
      try {
        await getPool().execute("UPDATE users SET deleted_at = NOW() WHERE user_id = ?", [id]);
        res.json({ status: "success", message: "User soft-deleted" });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to delete user" });
      }
    })
  );

  app.get(
    "/api/admin/reports",
    isAdmin,
    asyncHandler(async (_req, res) => {
      try {
        const pool = getPool();
        const [metrics] = (await pool.execute(`
          SELECT
            CAST(SUM(total_amount) AS DOUBLE) as total_revenue,
            COUNT(*) as total_orders,
            (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
            (SELECT COUNT(*) FROM users WHERE role = 'seller' AND status = 'active' AND deleted_at IS NULL) as active_sellers
          FROM orders
          WHERE status != 'cancelled'
        `)) as unknown as [Row[], unknown];

        const [trend] = (await pool.execute(`
          SELECT DATE(created_at) as date, CAST(SUM(total_amount) AS DOUBLE) as revenue
          FROM orders
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND status != 'cancelled'
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at)
        `)) as unknown as [Row[], unknown];

        const [sellerBreakdown] = (await pool.execute(`
          SELECT
            u.user_id, u.first_name, u.last_name, u.brand_name, u.status,
            COUNT(oi.order_item_id) as total_items_sold,
            CAST(SUM(oi.quantity * oi.price_at_purchase) AS DOUBLE) as revenue,
            COUNT(DISTINCT o.order_id) as total_orders
          FROM users u
          LEFT JOIN products p ON u.user_id = p.seller_id
          LEFT JOIN order_items oi ON p.product_id = oi.product_id
          LEFT JOIN orders o ON oi.order_id = o.order_id
          WHERE u.role = 'seller'
          AND u.deleted_at IS NULL
          AND (o.status != 'cancelled' OR o.order_id IS NULL)
          GROUP BY u.user_id
          ORDER BY revenue DESC
          LIMIT 10
        `)) as unknown as [Row[], unknown];

        res.json({
          status: "success",
          data: {
            metrics: metrics[0],
            trend,
            sellerBreakdown,
          },
        });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to load reports" });
      }
    })
  );

  // Admin Categories Management
  app.get(
    "/api/admin/categories",
    isAdmin,
    asyncHandler(async (_req, res) => {
      const [rows] = (await getPool().execute("SELECT * FROM categories")) as unknown as [Row[], unknown];
      res.json({ status: "success", data: rows });
    })
  );

  app.post(
    "/api/admin/categories",
    isAdmin,
    asyncHandler(async (req, res) => {
      // Unvalidated JSON body (`any`).
      const { category_name, description } = req.body ?? {};
      try {
        const [result] = (await getPool().execute("INSERT INTO categories (category_name, description) VALUES (?, ?)", [
          String(category_name),
          description == null ? "" : String(description),
        ])) as unknown as [{ insertId: number }, unknown];
        res.json({ status: "success", data: { category_id: result.insertId } });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to create category" });
      }
    })
  );

  app.put(
    "/api/admin/categories/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      // Unvalidated JSON body (`any`).
      const { category_name, description } = req.body ?? {};
      try {
        await getPool().execute("UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?", [
          String(category_name),
          description == null ? "" : String(description),
          id,
        ]);
        res.json({ status: "success", message: "Category updated" });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to update category" });
      }
    })
  );

  app.delete(
    "/api/admin/categories/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      try {
        // Check if any products use this category
        const [products] = (await getPool().execute("SELECT 1 FROM products WHERE category_id = ? LIMIT 1", [
          id,
        ])) as unknown as [Row[], unknown];
        if (products.length > 0) {
          res.status(400).json({ status: "error", message: "Cannot delete category being used by products" });
          return;
        }
        await getPool().execute("DELETE FROM categories WHERE category_id = ?", [id]);
        res.json({ status: "success", message: "Category deleted" });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to delete category" });
      }
    })
  );

  // Admin Sizes Management
  app.get(
    "/api/admin/sizes",
    isAdmin,
    asyncHandler(async (_req, res) => {
      const [rows] = (await getPool().execute(
        "SELECT * FROM sizes ORDER BY CAST(size_value AS DECIMAL(10,2)) ASC, size_value ASC"
      )) as unknown as [Row[], unknown];
      res.json({ status: "success", data: rows });
    })
  );

  app.post(
    "/api/admin/sizes",
    isAdmin,
    asyncHandler(async (req, res) => {
      // Unvalidated JSON body (`any`).
      const { size_value } = req.body ?? {};
      try {
        const [result] = (await getPool().execute("INSERT INTO sizes (size_value) VALUES (?)", [
          String(size_value),
        ])) as unknown as [{ insertId: number }, unknown];
        res.json({ status: "success", data: { size_id: result.insertId } });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to create size" });
      }
    })
  );

  app.delete(
    "/api/admin/sizes/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      try {
        // Check if any inventory uses this size
        const [inv] = (await getPool().execute("SELECT 1 FROM inventory WHERE size_id = ? LIMIT 1", [
          id,
        ])) as unknown as [Row[], unknown];
        if (inv.length > 0) {
          res.status(400).json({ status: "error", message: "Cannot delete size being used in inventory" });
          return;
        }
        await getPool().execute("DELETE FROM sizes WHERE size_id = ?", [id]);
        res.json({ status: "success", message: "Size deleted" });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to delete size" });
      }
    })
  );
}
