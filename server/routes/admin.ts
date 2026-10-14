import type { Express } from "express";
import bcrypt from "bcryptjs";
import { getPool } from "../db";
import { isAdmin, type AuthedRequest } from "../auth";
import { asyncHandler, EMAIL_RE, mapDbError, parseId, type Row } from "../utils";

const ALLOWED_USER_ROLES = new Set(["customer", "seller", "admin"]);
const ALLOWED_USER_STATUSES = new Set(["active", "pending_approval", "suspended", "inactive"]);
const ALLOWED_PAYMENT_STATUSES = ["paid", "refunded"] as const;

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
      } catch {
        res.status(500).json({ status: "error", message: "Failed to load dashboard" });
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
      } catch {
        res.status(500).json({ status: "error", message: "Failed to load users" });
      }
    })
  );

  app.post(
    "/api/admin/users",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { email, password, role, first_name, last_name, brand_name, status } = req.body ?? {};
      if (typeof email !== "string" || email.length > 255 || !EMAIL_RE.test(email.trim())) {
        res.status(400).json({ status: "error", message: "Invalid email address" });
        return;
      }
      if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ status: "error", message: "Password must be at least 8 characters" });
        return;
      }
      const r = role === undefined || role === null || role === "" ? "customer" : String(role);
      if (!ALLOWED_USER_ROLES.has(r)) {
        res.status(400).json({ status: "error", message: "Invalid role" });
        return;
      }
      const st = status === undefined || status === null || status === "" ? "active" : String(status);
      if (!ALLOWED_USER_STATUSES.has(st)) {
        res.status(400).json({ status: "error", message: "Invalid status" });
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
        const hash = await bcrypt.hash(String(password), 10);
        const username = String(email).split("@")[0] + "_" + Math.floor(Math.random() * 1000);
        await getPool().execute(
          "INSERT INTO users (username, email, password_hash, role, first_name, last_name, brand_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [username, email.trim(), hash, r, first_name || null, last_name || null, brand_name || null, st]
        );
        res.json({ status: "success", message: "User created by admin" });
      } catch (error: unknown) {
        console.error("Admin user create failed");
        const mapped = mapDbError(error, "Failed to create user");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      }
    })
  );

  app.put(
    "/api/admin/users/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const uid = parseId(req.params.id);
      if (uid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const admin = (req as AuthedRequest).user!;
      const { role, status, first_name, last_name, brand_name } = req.body ?? {};
      if (uid === admin.user_id) {
        if (role !== undefined && role !== null && String(role) !== "admin") {
          res.status(400).json({ status: "error", message: "Cannot change your own role" });
          return;
        }
        if (status !== undefined && status !== null && String(status) !== "active") {
          res.status(400).json({ status: "error", message: "Cannot deactivate your own account" });
          return;
        }
      }
      if (role !== undefined && role !== null && !ALLOWED_USER_ROLES.has(String(role))) {
        res.status(400).json({ status: "error", message: "Invalid role" });
        return;
      }
      if (status !== undefined && status !== null && !ALLOWED_USER_STATUSES.has(String(status))) {
        res.status(400).json({ status: "error", message: "Invalid status" });
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
      const sets: string[] = [];
      const vals: Array<string | number | null> = [];
      if (role !== undefined && role !== null) {
        sets.push("role = ?");
        vals.push(String(role));
      }
      if (status !== undefined && status !== null) {
        sets.push("status = ?");
        vals.push(String(status));
      }
      if (first_name !== undefined) {
        sets.push("first_name = ?");
        vals.push(first_name == null ? null : String(first_name));
      }
      if (last_name !== undefined) {
        sets.push("last_name = ?");
        vals.push(last_name == null ? null : String(last_name));
      }
      if (brand_name !== undefined) {
        sets.push("brand_name = ?");
        vals.push(brand_name == null ? null : String(brand_name));
      }
      if (sets.length === 0) {
        res.status(400).json({ status: "error", message: "No fields to update" });
        return;
      }
      try {
        const [result] = (await getPool().execute(
          `UPDATE users SET ${sets.join(", ")} WHERE user_id = ?`,
          [...vals, uid]
        )) as unknown as [{ affectedRows: number }, unknown];
        if (result.affectedRows === 0) {
          res.status(404).json({ status: "error", message: "User not found" });
          return;
        }
        res.json({ status: "success", message: "User updated" });
      } catch (error: unknown) {
        console.error("Admin user update failed");
        const mapped = mapDbError(error, "Failed to update user");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      }
    })
  );

  app.delete(
    "/api/admin/users/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const uid = parseId(req.params.id);
      if (uid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const admin = (req as AuthedRequest).user!;
      if (uid === admin.user_id) {
        res.status(400).json({ status: "error", message: "Cannot delete yourself" });
        return;
      }
      try {
        const [result] = (await getPool().execute("UPDATE users SET deleted_at = NOW() WHERE user_id = ?", [
          uid,
        ])) as unknown as [{ affectedRows: number }, unknown];
        if (result.affectedRows === 0) {
          res.status(404).json({ status: "error", message: "User not found" });
          return;
        }
        res.json({ status: "success", message: "User soft-deleted" });
      } catch {
        res.status(400).json({ status: "error", message: "Failed to delete user" });
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
      } catch {
        res.status(500).json({ status: "error", message: "Failed to load reports" });
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
      const { category_name, description } = req.body ?? {};
      if (typeof category_name !== "string" || category_name.trim().length < 1 || category_name.trim().length > 255) {
        res.status(400).json({ status: "error", message: "Category name must be 1-255 characters" });
        return;
      }
      const name = category_name.trim();
      const desc = description == null ? "" : String(description);
      if (desc.length > 5000) {
        res.status(400).json({ status: "error", message: "Description is too long" });
        return;
      }
      try {
        const pool = getPool();
        const [dup] = (await pool.execute("SELECT 1 FROM categories WHERE category_name = ? LIMIT 1", [
          name,
        ])) as unknown as [Row[], unknown];
        if (dup.length > 0) {
          res.status(409).json({ status: "error", message: "Already exists" });
          return;
        }
        const [result] = (await pool.execute("INSERT INTO categories (category_name, description) VALUES (?, ?)", [
          name,
          desc,
        ])) as unknown as [{ insertId: number }, unknown];
        res.json({ status: "success", data: { category_id: result.insertId } });
      } catch (error: unknown) {
        console.error("Admin category create failed");
        const mapped = mapDbError(error, "Failed to create category");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      }
    })
  );

  app.put(
    "/api/admin/categories/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const cid = parseId(req.params.id);
      if (cid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const { category_name, description } = req.body ?? {};
      if (typeof category_name !== "string" || category_name.trim().length < 1 || category_name.trim().length > 255) {
        res.status(400).json({ status: "error", message: "Category name must be 1-255 characters" });
        return;
      }
      const name = category_name.trim();
      const desc = description == null ? "" : String(description);
      if (desc.length > 5000) {
        res.status(400).json({ status: "error", message: "Description is too long" });
        return;
      }
      try {
        const pool = getPool();
        const [dup] = (await pool.execute(
          "SELECT 1 FROM categories WHERE category_name = ? AND category_id != ? LIMIT 1",
          [name, cid]
        )) as unknown as [Row[], unknown];
        if (dup.length > 0) {
          res.status(409).json({ status: "error", message: "Already exists" });
          return;
        }
        const [result] = (await pool.execute(
          "UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?",
          [name, desc, cid]
        )) as unknown as [{ affectedRows: number }, unknown];
        if (result.affectedRows === 0) {
          res.status(404).json({ status: "error", message: "Category not found" });
          return;
        }
        res.json({ status: "success", message: "Category updated" });
      } catch (error: unknown) {
        console.error("Admin category update failed");
        const mapped = mapDbError(error, "Failed to update category");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      }
    })
  );

  app.delete(
    "/api/admin/categories/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const cid = parseId(req.params.id);
      if (cid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      try {
        const pool = getPool();
        const [products] = (await pool.execute("SELECT 1 FROM products WHERE category_id = ? LIMIT 1", [
          cid,
        ])) as unknown as [Row[], unknown];
        if (products.length > 0) {
          res.status(400).json({ status: "error", message: "Cannot delete category being used by products" });
          return;
        }
        const [result] = (await pool.execute("DELETE FROM categories WHERE category_id = ?", [
          cid,
        ])) as unknown as [{ affectedRows: number }, unknown];
        if (result.affectedRows === 0) {
          res.status(404).json({ status: "error", message: "Category not found" });
          return;
        }
        res.json({ status: "success", message: "Category deleted" });
      } catch {
        res.status(400).json({ status: "error", message: "Failed to delete category" });
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
      const { size_value } = req.body ?? {};
      if (typeof size_value !== "string" || size_value.trim().length < 1 || size_value.trim().length > 20) {
        if (size_value === undefined || size_value === null) {
          res.status(400).json({ status: "error", message: "Size value is required" });
          return;
        }
        res.status(400).json({ status: "error", message: "Size value must be 1-20 characters" });
        return;
      }
      const val = String(size_value).trim();
      try {
        const pool = getPool();
        const [dup] = (await pool.execute("SELECT 1 FROM sizes WHERE size_value = ? LIMIT 1", [
          val,
        ])) as unknown as [Row[], unknown];
        if (dup.length > 0) {
          res.status(409).json({ status: "error", message: "Already exists" });
          return;
        }
        const [result] = (await pool.execute("INSERT INTO sizes (size_value) VALUES (?)", [
          val,
        ])) as unknown as [{ insertId: number }, unknown];
        res.json({ status: "success", data: { size_id: result.insertId } });
      } catch (error: unknown) {
        console.error("Admin size create failed");
        const mapped = mapDbError(error, "Failed to create size");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      }
    })
  );

  app.delete(
    "/api/admin/sizes/:id",
    isAdmin,
    asyncHandler(async (req, res) => {
      const sid = parseId(req.params.id);
      if (sid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      try {
        const pool = getPool();
        const [inv] = (await pool.execute("SELECT 1 FROM inventory WHERE size_id = ? LIMIT 1", [
          sid,
        ])) as unknown as [Row[], unknown];
        if (inv.length > 0) {
          res.status(400).json({ status: "error", message: "Cannot delete size being used in inventory" });
          return;
        }
        const [result] = (await pool.execute("DELETE FROM sizes WHERE size_id = ?", [
          sid,
        ])) as unknown as [{ affectedRows: number }, unknown];
        if (result.affectedRows === 0) {
          res.status(404).json({ status: "error", message: "Size not found" });
          return;
        }
        res.json({ status: "success", message: "Size deleted" });
      } catch {
        res.status(400).json({ status: "error", message: "Failed to delete size" });
      }
    })
  );

  app.put(
    "/api/admin/orders/payment",
    isAdmin,
    asyncHandler(async (req, res) => {
      const { order_id, payment_status } = req.body ?? {};
      const orderId = parseId(order_id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      if (!ALLOWED_PAYMENT_STATUSES.includes(String(payment_status) as (typeof ALLOWED_PAYMENT_STATUSES)[number])) {
        res.status(400).json({ status: "error", message: "Invalid payment status" });
        return;
      }
      const next = String(payment_status);

      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [orderRows] = (await conn.execute(
          "SELECT payment_status FROM orders WHERE order_id = ? FOR UPDATE",
          [orderId]
        )) as unknown as [Array<{ payment_status: string }>, unknown];
        const order = orderRows[0];

        if (!order) {
          await conn.rollback();
          res.status(404).json({ status: "error", message: "Order not found" });
          return;
        }

        if (order.payment_status === next) {
          await conn.rollback();
          res.json({ status: "success", message: `Order already marked as ${next}` });
          return;
        }

        // Admins are intentionally unscoped: they may mark any order.
        await conn.execute("UPDATE orders SET payment_status = ? WHERE order_id = ?", [next, orderId]);
        await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [orderId, next]);
        await conn.commit();
        res.json({ status: "success", message: `Order payment updated to ${next}` });
      } catch {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Admin order payment update failed");
        res.status(500).json({ status: "error", message: "Failed to update order payment" });
      } finally {
        conn.release();
      }
    })
  );
}
