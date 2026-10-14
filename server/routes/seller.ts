import type { Express } from "express";
import { getPool } from "../db";
import { LOW_STOCK_THRESHOLD } from "../config";
import { isSeller, type AuthedRequest } from "../auth";
import { asyncHandler, parseDays, type Row } from "../utils";

export function registerSellerRoutes(app: Express): void {
  app.get(
    "/api/seller/dashboard",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const pool = getPool();

      const [statsRows] = (await pool.execute(
        `
        SELECT
          (SELECT COUNT(*) FROM products WHERE seller_id = ? AND deleted_at IS NULL) as total_products,
          (SELECT CAST(SUM(stock_quantity) AS DOUBLE) FROM inventory i JOIN products p ON i.product_id = p.product_id WHERE p.seller_id = ? AND p.deleted_at IS NULL AND i.deleted_at IS NULL) as total_stock,
          (SELECT CAST(SUM(i.stock_quantity * p.base_price) AS DOUBLE) FROM inventory i JOIN products p ON i.product_id = p.product_id WHERE p.seller_id = ? AND p.deleted_at IS NULL AND i.deleted_at IS NULL) as inventory_value,
          (SELECT COUNT(*) FROM (
            SELECT p.product_id
            FROM products p
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.seller_id = ? AND p.deleted_at IS NULL AND i.deleted_at IS NULL
            GROUP BY p.product_id
            HAVING SUM(i.stock_quantity) < ?
          ) as low_stock_products) as low_stock_count
      `,
        [sellerId, sellerId, sellerId, sellerId, LOW_STOCK_THRESHOLD]
      )) as unknown as [Row[], unknown];
      const stats = statsRows[0];

      const [trend] = (await pool.execute(
        `
        SELECT DATE(o.created_at) as date, CAST(SUM(oi.quantity * oi.price_at_purchase) AS DOUBLE) as revenue
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(o.created_at)
        ORDER BY DATE(o.created_at)
      `,
        [sellerId]
      )) as unknown as [Row[], unknown];

      const [topSelling] = (await pool.execute(
        `
        SELECT p.product_id, p.product_name, SUM(oi.quantity) as units_sold
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.seller_id = ?
        GROUP BY p.product_id, p.product_name
        ORDER BY units_sold DESC
        LIMIT 5
      `,
        [sellerId]
      )) as unknown as [Row[], unknown];

      res.json({ status: "success", data: { ...stats, trend, topSelling } });
    })
  );

  app.get(
    "/api/seller/products",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const pool = getPool();
      const [products] = (await pool.execute(
        `
        SELECT p.*, c.category_name,
               (SELECT SUM(stock_quantity) FROM inventory WHERE product_id = p.product_id AND deleted_at IS NULL) as total_stock,
               (SELECT AVG(rating) FROM reviews WHERE product_id = p.product_id) as average_rating,
               (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as total_reviews
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        WHERE p.seller_id = ? AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `,
        [sellerId]
      )) as unknown as [Array<Row & { product_id: number; inventory?: Row[] }>, unknown];

      for (const prod of products) {
        const [inventory] = (await pool.execute(
          `
          SELECT i.*, s.size_value
          FROM inventory i
          JOIN sizes s ON i.size_id = s.size_id
          WHERE i.product_id = ? AND i.deleted_at IS NULL
        `,
          [prod.product_id]
        )) as unknown as [Row[], unknown];
        prod.inventory = inventory;
      }

      res.json({ status: "success", data: products });
    })
  );

  app.post(
    "/api/seller/products",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      // Unvalidated JSON body (`any`); numbers coerced below so binding is typed.
      const { product_name, description, base_price, category_id, image_url, inventory } = req.body ?? {};

      const price = Number(base_price);
      const catId = Number(category_id);
      if (typeof product_name !== "string" || product_name.trim() === "" || !Number.isFinite(price) || price < 0) {
        res.status(400).json({ status: "error", message: "Product name and a valid price are required" });
        return;
      }
      if (!Number.isInteger(catId) || catId <= 0) {
        res.status(400).json({ status: "error", message: "Invalid category" });
        return;
      }

      try {
        const pool = getPool();
        const [result] = (await pool.execute(
          "INSERT INTO products (seller_id, category_id, product_name, description, base_price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
          [sellerId, catId, product_name, description == null ? null : String(description), price, image_url == null ? null : String(image_url)]
        )) as unknown as [{ insertId: number }, unknown];
        const productId = result.insertId;

        if (inventory && Array.isArray(inventory)) {
          for (const item of inventory) {
            const sizeId = Number(item?.size_id);
            const stock = Number(item?.stock_quantity);
            if (!Number.isInteger(sizeId) || sizeId <= 0 || !Number.isInteger(stock) || stock < 0) {
              throw new Error("Invalid inventory entry");
            }
            await pool.execute("INSERT INTO inventory (product_id, size_id, stock_quantity) VALUES (?, ?, ?)", [
              productId,
              sizeId,
              stock,
            ]);
          }
        }

        res.json({ status: "success", message: "Product added successfully", data: { product_id: productId } });
      } catch (error: unknown) {
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to add product" });
      }
    })
  );

  app.put(
    "/api/seller/products",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      // Unvalidated JSON body (`any`); ids/numbers coerced below.
      const { product_id, product_name, description, base_price, category_id, image_url, inventory } = req.body ?? {};
      const productId = Number(product_id);
      if (!Number.isInteger(productId) || productId <= 0) {
        res.status(400).json({ status: "error", message: "Invalid product" });
        return;
      }

      const pool = getPool();
      const [ownerRows] = (await pool.execute("SELECT 1 FROM products WHERE product_id = ? AND seller_id = ?", [
        productId,
        sellerId,
      ])) as unknown as [Row[], unknown];
      if (ownerRows.length === 0) {
        res.status(403).json({ status: "error", message: "Product not found or access denied" });
        return;
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.execute(
          "UPDATE products SET product_name = ?, description = ?, base_price = ?, category_id = ?, image_url = ? WHERE product_id = ?",
          [
            String(product_name),
            description == null ? null : String(description),
            Number(base_price),
            Number(category_id),
            image_url == null ? null : String(image_url),
            productId,
          ]
        );

        if (inventory && Array.isArray(inventory)) {
          for (const item of inventory) {
            const stock = Number(item?.stock_quantity);
            if (!Number.isInteger(stock) || stock < 0) {
              throw new Error("Invalid stock quantity");
            }
            const invId = item?.inventory_id == null ? null : Number(item.inventory_id);
            const sizeId = item?.size_id == null ? null : Number(item.size_id);
            if (invId !== null) {
              await conn.execute("UPDATE inventory SET stock_quantity = ? WHERE inventory_id = ? AND product_id = ?", [
                stock,
                invId,
                productId,
              ]);
            } else {
              if (sizeId === null || !Number.isInteger(sizeId) || sizeId <= 0) {
                throw new Error("Invalid size for inventory entry");
              }
              await conn.execute("INSERT INTO inventory (product_id, size_id, stock_quantity) VALUES (?, ?, ?)", [
                productId,
                sizeId,
                stock,
              ]);
            }
          }
        }

        await conn.commit();
        res.json({ status: "success", message: "Product updated" });
      } catch (error: unknown) {
        await conn.rollback();
        res
          .status(400)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to update product" });
      } finally {
        conn.release();
      }
    })
  );

  app.delete(
    "/api/seller/products",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const { id } = req.query as Record<string, string>;

      const [result] = (await getPool().execute(
        "UPDATE products SET deleted_at = NOW() WHERE product_id = ? AND seller_id = ?",
        [String(id), sellerId]
      )) as unknown as [{ affectedRows: number }, unknown];

      if (result.affectedRows > 0) {
        res.json({ status: "success", message: "Product deleted (soft delete)" });
      } else {
        res.status(404).json({ status: "error", message: "Product not found" });
      }
    })
  );

  app.get(
    "/api/seller/reports/sales",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      // Validated + clamped; INTERVAL ? DAY takes a bound value param (not LIMIT), so placeholders are safe here.
      const days = parseDays(req.query.days);
      const pool = getPool();

      const [metricsRows] = (await pool.execute(
        `
        SELECT
          CAST(SUM(oi.quantity * oi.price_at_purchase) AS DOUBLE) as total_revenue,
          COUNT(DISTINCT o.order_id) as total_orders,
          CAST(AVG(o.total_amount) AS DOUBLE) as aov,
          COUNT(DISTINCT o.user_id) as total_customers,
          CAST(SUM(oi.quantity) AS DOUBLE) as products_sold,
          (SELECT COUNT(*) FROM orders o2 JOIN order_items oi2 ON o2.order_id = oi2.order_id JOIN products p2 ON oi2.product_id = p2.product_id WHERE p2.seller_id = ? AND o2.status = 'pending') as pending_orders_count
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
        [sellerId, sellerId, days]
      )) as unknown as [Row[], unknown];
      const metrics = metricsRows[0];

      const [trend] = (await pool.execute(
        `
        SELECT DATE(o.created_at) as date, CAST(SUM(oi.quantity * oi.price_at_purchase) AS DOUBLE) as revenue
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(o.created_at)
        ORDER BY DATE(o.created_at)
      `,
        [sellerId, days]
      )) as unknown as [Row[], unknown];

      const [categoryBreakdown] = (await pool.execute(
        `
        SELECT c.category_name, CAST(SUM(oi.quantity * oi.price_at_purchase) AS DOUBLE) as value
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        JOIN categories c ON p.category_id = c.category_id
        WHERE p.seller_id = ?
        GROUP BY c.category_id, c.category_name
      `,
        [sellerId]
      )) as unknown as [Row[], unknown];

      const [topSelling] = (await pool.execute(
        `
        SELECT p.product_id, p.product_name, SUM(oi.quantity) as units_sold, CAST(SUM(oi.quantity * oi.price_at_purchase) AS DOUBLE) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE p.seller_id = ?
        GROUP BY p.product_id, p.product_name
        ORDER BY units_sold DESC
        LIMIT 10
      `,
        [sellerId]
      )) as unknown as [Row[], unknown];

      res.json({ status: "success", data: { metrics, trend, categoryBreakdown, topSelling } });
    })
  );

  app.get(
    "/api/seller/reviews",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const { product_id } = req.query as { product_id?: string };

      if (!product_id) {
        res.status(400).json({ status: "error", message: "product_id is required" });
        return;
      }

      const pool = getPool();
      const [ownerCheck] = (await pool.execute(
        "SELECT product_id FROM products WHERE product_id = ? AND seller_id = ? AND deleted_at IS NULL",
        [product_id, sellerId]
      )) as unknown as [Row[], unknown];

      if (!ownerCheck.length) {
        res.status(403).json({ status: "error", message: "Access denied" });
        return;
      }

      const [reviews] = (await pool.execute(
        "SELECT review_id, customer_name, rating, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC",
        [product_id]
      )) as unknown as [Row[], unknown];

      res.json({ status: "success", data: reviews });
    })
  );

  app.get(
    "/api/seller/orders",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const pool = getPool();
      const [orders] = (await pool.execute(
        `
        SELECT DISTINCT o.order_id, o.total_amount, o.status as order_status, o.payment_status,
               o.shipping_address, o.payment_method, o.created_at as order_date,
               u.first_name, u.last_name
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN products p ON oi.product_id = p.product_id
        JOIN users u ON o.user_id = u.user_id
        WHERE p.seller_id = ?
        ORDER BY o.created_at DESC
      `,
        [sellerId]
      )) as unknown as [Array<Row & { order_id: number; items?: Row[] }>, unknown];

      for (const order of orders) {
        const [items] = (await pool.execute(
          `
          SELECT oi.*, p.product_name, s.size_value
          FROM order_items oi
          JOIN products p ON oi.product_id = p.product_id
          LEFT JOIN sizes s ON oi.size_id = s.size_id
          WHERE oi.order_id = ? AND p.seller_id = ?
        `,
          [order.order_id, sellerId]
        )) as unknown as [Row[], unknown];
        order.items = items;
      }

      res.json({ status: "success", data: orders });
    })
  );

  app.put(
    "/api/seller/orders/status",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      // Unvalidated JSON body (`any`); status allowlisted below.
      const { order_id, status } = req.body ?? {};
      const orderId = String(order_id);

      const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
      if (!validStatuses.includes(String(status))) {
        res.status(400).json({ status: "error", message: "Invalid status" });
        return;
      }

      const pool = getPool();
      const [orderRows] = (await pool.execute("SELECT status FROM orders WHERE order_id = ?", [
        orderId,
      ])) as unknown as [Array<{ status: string }>, unknown];
      const order = orderRows[0];

      if (!order) {
        res.status(404).json({ status: "error", message: "Order not found" });
        return;
      }

      if (order.status === "delivered" || order.status === "cancelled") {
        res.status(400).json({ status: "error", message: `Cannot update status of a ${order.status} order` });
        return;
      }

      const [hasItemsRows] = (await pool.execute(
        `
        SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `,
        [orderId, sellerId]
      )) as unknown as [Row[], unknown];

      if (hasItemsRows.length > 0) {
        await pool.execute("UPDATE orders SET status = ? WHERE order_id = ?", [String(status), orderId]);
        await pool.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [orderId, String(status)]);
        res.json({ status: "success", message: `Order status updated to ${status}` });
      } else {
        res.status(403).json({ status: "error", message: "Access denied or order not found" });
      }
    })
  );

  app.get(
    "/api/seller/profile",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const pool = getPool();
      const [userRows] = (await pool.execute(
        "SELECT user_id, username, email, brand_name, first_name, last_name FROM users WHERE user_id = ?",
        [sellerId]
      )) as unknown as [Row[], unknown];
      const [profileRows] = (await pool.execute("SELECT * FROM seller_profiles WHERE seller_id = ?", [
        sellerId,
      ])) as unknown as [Row[], unknown];
      res.json({ status: "success", data: { ...userRows[0], profile: profileRows[0] || null } });
    })
  );

  app.put(
    "/api/seller/profile",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      // Unvalidated JSON body (`any`); null-preserving coercion below.
      const { brand_name, description, logo_url, banner_url, location, contact_email, phone } = req.body ?? {};
      const pool = getPool();
      if (brand_name) {
        await pool.execute("UPDATE users SET brand_name = ? WHERE user_id = ?", [String(brand_name), sellerId]);
      }
      await pool.execute(
        `
        INSERT INTO seller_profiles (seller_id, description, logo_url, banner_url, location, contact_email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description), logo_url = VALUES(logo_url), banner_url = VALUES(banner_url), location = VALUES(location), contact_email = VALUES(contact_email), phone = VALUES(phone)
      `,
        [
          sellerId,
          description == null || description === "" ? null : String(description),
          logo_url == null || logo_url === "" ? null : String(logo_url),
          banner_url == null || banner_url === "" ? null : String(banner_url),
          location == null || location === "" ? null : String(location),
          contact_email == null || contact_email === "" ? null : String(contact_email),
          phone == null || phone === "" ? null : String(phone),
        ]
      );
      const [userRows] = (await pool.execute(
        "SELECT user_id, username, email, brand_name, first_name, last_name FROM users WHERE user_id = ?",
        [sellerId]
      )) as unknown as [Row[], unknown];
      const [profileRows] = (await pool.execute("SELECT * FROM seller_profiles WHERE seller_id = ?", [
        sellerId,
      ])) as unknown as [Row[], unknown];
      res.json({ status: "success", data: { ...userRows[0], profile: profileRows[0] || null } });
    })
  );
}
