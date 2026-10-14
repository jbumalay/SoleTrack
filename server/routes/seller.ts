import type { Express } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPool } from "../db";
import { LOW_STOCK_THRESHOLD } from "../config";
import { isSeller, type AuthedRequest } from "../auth";
import { asyncHandler, EMAIL_RE, mapDbError, parseDays, parseId, type Row } from "../utils";

const ALLOWED_ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const ALLOWED_PAYMENT_STATUSES = ["paid", "refunded"] as const;

/** Demo-scale image uploads: base64 body -> disk under public/uploads. */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Sniff magic bytes so a mislabeled content-type cannot smuggle other files. */
function hasImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // JPEG
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return true; // PNG
  if (buffer.subarray(0, 4).toString("ascii") === "GIF8") return true; // GIF
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return true; // WebP
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") return true; // AVIF/HEIF
  return false;
}

function invalidProductFields(
  product_name: unknown,
  base_price: unknown,
  category_id: unknown,
  opts: { allowZeroPrice: boolean }
): { price: number; catId: number; name: string } | { error: string } {
  if (typeof product_name !== "string" || product_name.trim().length < 1 || product_name.trim().length > 255) {
    return { error: "Product name must be 1-255 characters" };
  }
  const price = Number(base_price);
  if (!Number.isFinite(price) || price < 0 || price > 99999999 || (!opts.allowZeroPrice && price <= 0)) {
    return { error: "Price must be a valid amount" };
  }
  const catId = Number(category_id);
  if (!Number.isInteger(catId) || catId <= 0) {
    return { error: "Invalid category" };
  }
  return { price, catId, name: product_name.trim() };
}

export function registerSellerRoutes(app: Express): void {
  app.post(
    "/api/seller/uploads",
    isSeller,
    asyncHandler(async (req, res) => {
      const { filename, content_type, data } = req.body ?? {};
      const ext = ALLOWED_IMAGE_TYPES[String(content_type)];
      if (!ext) {
        res.status(400).json({ status: "error", message: "Only JPG, PNG, WebP, GIF or AVIF images are allowed" });
        return;
      }
      if (filename !== undefined && (typeof filename !== "string" || filename.length > 255)) {
        res.status(400).json({ status: "error", message: "Invalid filename" });
        return;
      }
      if (typeof data !== "string" || data.length === 0) {
        res.status(400).json({ status: "error", message: "Image data is required" });
        return;
      }
      const buffer = Buffer.from(data, "base64");
      if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
        res.status(400).json({ status: "error", message: "Image must be a non-empty file up to 2MB" });
        return;
      }
      if (!hasImageMagicBytes(buffer)) {
        res.status(400).json({ status: "error", message: "File does not look like an image" });
        return;
      }

      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const storedName = `product-${crypto.randomUUID()}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);
      res.json({ status: "success", data: { url: `/uploads/${storedName}`, filename: storedName } });
    })
  );

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
      const { product_name, description, base_price, category_id, image_url, inventory } = req.body ?? {};

      const checked = invalidProductFields(product_name, base_price, category_id, { allowZeroPrice: false });
      if ("error" in checked) {
        res.status(400).json({ status: "error", message: checked.error });
        return;
      }
      if (description !== undefined && description !== null && String(description).length > 5000) {
        res.status(400).json({ status: "error", message: "Description is too long" });
        return;
      }
      if (image_url !== undefined && image_url !== null && String(image_url).length > 2048) {
        res.status(400).json({ status: "error", message: "Image URL is too long" });
        return;
      }

      const pool = getPool();
      const [catRows] = (await pool.execute("SELECT 1 FROM categories WHERE category_id = ?", [
        checked.catId,
      ])) as unknown as [Row[], unknown];
      if (catRows.length === 0) {
        res.status(400).json({ status: "error", message: "Invalid category" });
        return;
      }

      type InvEntry = { sizeId: number; stock: number };
      let entries: InvEntry[] = [];
      if (inventory !== undefined && inventory !== null) {
        if (!Array.isArray(inventory)) {
          res.status(400).json({ status: "error", message: "Invalid inventory" });
          return;
        }
        const seen = new Set<number>();
        for (const item of inventory) {
          const sizeId = Number((item as Record<string, unknown>)?.size_id);
          const stock = Number((item as Record<string, unknown>)?.stock_quantity);
          if (!Number.isInteger(sizeId) || sizeId <= 0 || !Number.isInteger(stock) || stock < 0) {
            res.status(400).json({ status: "error", message: "Invalid inventory entry" });
            return;
          }
          if (seen.has(sizeId)) {
            res.status(400).json({ status: "error", message: "Duplicate size in inventory" });
            return;
          }
          seen.add(sizeId);
          entries.push({ sizeId, stock });
        }
        for (const e of entries) {
          const [sRows] = (await pool.execute("SELECT 1 FROM sizes WHERE size_id = ?", [
            e.sizeId,
          ])) as unknown as [Row[], unknown];
          if (sRows.length === 0) {
            res.status(400).json({ status: "error", message: "Invalid size" });
            return;
          }
        }
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = (await conn.execute(
          "INSERT INTO products (seller_id, category_id, product_name, description, base_price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
          [
            sellerId,
            checked.catId,
            checked.name,
            description == null ? null : String(description),
            checked.price,
            image_url == null ? null : String(image_url),
          ]
        )) as unknown as [{ insertId: number }, unknown];
        const productId = result.insertId;

        for (const e of entries) {
          await conn.execute("INSERT INTO inventory (product_id, size_id, stock_quantity) VALUES (?, ?, ?)", [
            productId,
            e.sizeId,
            e.stock,
          ]);
        }

        await conn.commit();
        res.json({ status: "success", message: "Product added successfully", data: { product_id: productId } });
      } catch (error: unknown) {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Seller product create failed");
        const mapped = mapDbError(error, "Failed to add product");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
      } finally {
        conn.release();
      }
    })
  );

  app.put(
    "/api/seller/products",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const { product_id, product_name, description, base_price, category_id, image_url, inventory } = req.body ?? {};
      const productId = Number(product_id);
      if (!Number.isInteger(productId) || productId <= 0) {
        res.status(400).json({ status: "error", message: "Invalid product" });
        return;
      }
      const checked = invalidProductFields(product_name, base_price, category_id, { allowZeroPrice: true });
      if ("error" in checked) {
        res.status(400).json({ status: "error", message: checked.error });
        return;
      }
      if (description !== undefined && description !== null && String(description).length > 5000) {
        res.status(400).json({ status: "error", message: "Description is too long" });
        return;
      }
      if (image_url !== undefined && image_url !== null && String(image_url).length > 2048) {
        res.status(400).json({ status: "error", message: "Image URL is too long" });
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
      const [catRows] = (await pool.execute("SELECT 1 FROM categories WHERE category_id = ?", [
        checked.catId,
      ])) as unknown as [Row[], unknown];
      if (catRows.length === 0) {
        res.status(400).json({ status: "error", message: "Invalid category" });
        return;
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.execute(
          "UPDATE products SET product_name = ?, description = ?, base_price = ?, category_id = ?, image_url = ? WHERE product_id = ?",
          [
            checked.name,
            description == null ? null : String(description),
            checked.price,
            checked.catId,
            image_url == null ? null : String(image_url),
            productId,
          ]
        );

        if (inventory !== undefined && inventory !== null) {
          if (!Array.isArray(inventory)) {
            throw new Error("Invalid inventory");
          }
          const seenNew = new Set<number>();
          for (const item of inventory) {
            const rec = item as Record<string, unknown>;
            const stock = Number(rec?.stock_quantity);
            if (!Number.isInteger(stock) || stock < 0) {
              throw new Error("Invalid stock quantity");
            }
            const invId = rec?.inventory_id == null ? null : Number(rec.inventory_id);
            const sizeId = rec?.size_id == null ? null : Number(rec.size_id);
            if (invId !== null) {
              if (!Number.isInteger(invId) || invId <= 0) {
                throw new Error("Invalid inventory entry");
              }
              const [invUpd] = (await conn.execute(
                "UPDATE inventory SET stock_quantity = ? WHERE inventory_id = ? AND product_id = ?",
                [stock, invId, productId]
              )) as unknown as [{ affectedRows: number }, unknown];
              if (invUpd.affectedRows === 0) {
                throw new Error("Invalid inventory entry");
              }
            } else {
              if (sizeId === null || !Number.isInteger(sizeId) || sizeId <= 0) {
                throw new Error("Invalid size for inventory entry");
              }
              if (seenNew.has(sizeId)) {
                throw new Error("Duplicate size in inventory");
              }
              seenNew.add(sizeId);
              const [sRows] = (await conn.execute("SELECT 1 FROM sizes WHERE size_id = ?", [
                sizeId,
              ])) as unknown as [Row[], unknown];
              if (sRows.length === 0) {
                throw new Error("Invalid size");
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
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Seller product update failed");
        const msg = error instanceof Error ? error.message : "";
        if (
          msg === "Invalid stock quantity" ||
          msg === "Invalid size for inventory entry" ||
          msg === "Invalid inventory entry" ||
          msg === "Invalid inventory" ||
          msg === "Invalid size" ||
          msg === "Duplicate size in inventory"
        ) {
          res.status(400).json({ status: "error", message: msg });
          return;
        }
        const mapped = mapDbError(error, "Failed to update product");
        res.status(mapped.http).json({ status: "error", message: mapped.message });
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
      const pid = parseId((req.query as Record<string, unknown>).id);
      if (pid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      const [result] = (await getPool().execute(
        "UPDATE products SET deleted_at = NOW() WHERE product_id = ? AND seller_id = ?",
        [pid, sellerId]
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
      const pid = parseId(product_id);
      if (pid === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      const pool = getPool();
      const [ownerCheck] = (await pool.execute(
        "SELECT product_id FROM products WHERE product_id = ? AND seller_id = ? AND deleted_at IS NULL",
        [pid, sellerId]
      )) as unknown as [Row[], unknown];

      if (!ownerCheck.length) {
        res.status(403).json({ status: "error", message: "Access denied" });
        return;
      }

      const [reviews] = (await pool.execute(
        "SELECT review_id, customer_name, rating, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC",
        [pid]
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
      const { order_id, status } = req.body ?? {};
      const orderId = parseId(order_id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      if (!ALLOWED_ORDER_STATUSES.includes(String(status) as (typeof ALLOWED_ORDER_STATUSES)[number])) {
        res.status(400).json({ status: "error", message: "Invalid status" });
        return;
      }
      const next = String(status);

      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [orderRows] = (await conn.execute(
          "SELECT status, payment_status FROM orders WHERE order_id = ? FOR UPDATE",
          [orderId]
        )) as unknown as [Array<{ status: string; payment_status: string }>, unknown];
        const order = orderRows[0];

        if (!order) {
          await conn.rollback();
          res.status(404).json({ status: "error", message: "Order not found" });
          return;
        }

        const [hasItemsRows] = (await conn.execute(
          `
          SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
          WHERE oi.order_id = ? AND p.seller_id = ?
        `,
          [orderId, sellerId]
        )) as unknown as [Row[], unknown];

        if (hasItemsRows.length === 0) {
          await conn.rollback();
          res.status(403).json({ status: "error", message: "Access denied or order not found" });
          return;
        }

        const allowed = NEXT_STATUS[order.status] ?? [];
        if (!allowed.includes(next)) {
          await conn.rollback();
          if (order.status === "delivered" || order.status === "cancelled") {
            res.status(400).json({ status: "error", message: `Cannot update status of a ${order.status} order` });
          } else {
            res.status(400).json({ status: "error", message: `Cannot change status from ${order.status} to ${next}` });
          }
          return;
        }

        if (next === "cancelled") {
          const [lines] = (await conn.execute(
            "SELECT product_id, size_id, quantity FROM order_items WHERE order_id = ?",
            [orderId]
          )) as unknown as [Array<{ product_id: number; size_id: number | null; quantity: number }>, unknown];
          for (const line of lines) {
            await conn.execute(
              `UPDATE inventory SET stock_quantity = stock_quantity + ?
               WHERE product_id = ? AND (size_id = ? OR (size_id IS NULL AND ? IS NULL)) AND deleted_at IS NULL`,
              [line.quantity, line.product_id, line.size_id, line.size_id]
            );
          }
        }

        const [upd] = (await conn.execute(
          `UPDATE orders SET status = ? WHERE order_id = ? AND EXISTS(
             SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
             WHERE oi.order_id = orders.order_id AND p.seller_id = ?
           )`,
          [next, orderId, sellerId]
        )) as unknown as [{ affectedRows: number }, unknown];
        if (upd.affectedRows === 0) {
          await conn.rollback();
          res.status(403).json({ status: "error", message: "Access denied or order not found" });
          return;
        }
        await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [orderId, next]);
        if (next === "cancelled" && order.payment_status === "paid") {
          await conn.execute("UPDATE orders SET payment_status = 'refunded' WHERE order_id = ?", [orderId]);
          await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, 'refunded')", [orderId]);
        }
        await conn.commit();
        res.json({ status: "success", message: `Order status updated to ${next}` });
      } catch {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Seller order status update failed");
        res.status(500).json({ status: "error", message: "Failed to update order status" });
      } finally {
        conn.release();
      }
    })
  );

  app.put(
    "/api/seller/orders/payment",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
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

        const [hasItemsRows] = (await conn.execute(
          `
          SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
          WHERE oi.order_id = ? AND p.seller_id = ?
        `,
          [orderId, sellerId]
        )) as unknown as [Row[], unknown];

        if (hasItemsRows.length === 0) {
          await conn.rollback();
          res.status(403).json({ status: "error", message: "Access denied or order not found" });
          return;
        }

        if (order.payment_status === next) {
          await conn.rollback();
          res.json({ status: "success", message: `Order already marked as ${next}` });
          return;
        }

        const [upd] = (await conn.execute(
          `UPDATE orders SET payment_status = ? WHERE order_id = ? AND EXISTS(
             SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
             WHERE oi.order_id = orders.order_id AND p.seller_id = ?
           )`,
          [next, orderId, sellerId]
        )) as unknown as [{ affectedRows: number }, unknown];
        if (upd.affectedRows === 0) {
          await conn.rollback();
          res.status(403).json({ status: "error", message: "Access denied or order not found" });
          return;
        }
        await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [orderId, next]);
        await conn.commit();
        res.json({ status: "success", message: `Order payment updated to ${next}` });
      } catch {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Seller order payment update failed");
        res.status(500).json({ status: "error", message: "Failed to update order payment" });
      } finally {
        conn.release();
      }
    })
  );

  app.put(
    "/api/seller/orders/return",
    isSeller,
    asyncHandler(async (req, res) => {
      const sellerId = (req as AuthedRequest).user!.user_id;
      const { order_id } = req.body ?? {};
      const orderId = parseId(order_id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [orderRows] = (await conn.execute(
          "SELECT status, payment_status FROM orders WHERE order_id = ? FOR UPDATE",
          [orderId]
        )) as unknown as [Array<{ status: string; payment_status: string }>, unknown];
        const order = orderRows[0];
        if (!order) {
          await conn.rollback();
          res.status(404).json({ status: "error", message: "Order not found" });
          return;
        }

        const [hasItemsRows] = (await conn.execute(
          `
          SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
          WHERE oi.order_id = ? AND p.seller_id = ?
        `,
          [orderId, sellerId]
        )) as unknown as [Row[], unknown];
        if (hasItemsRows.length === 0) {
          await conn.rollback();
          res.status(403).json({ status: "error", message: "Access denied or order not found" });
          return;
        }
        if (order.status !== "requested") {
          await conn.rollback();
          res.status(400).json({ status: "error", message: "Only requested returns can be approved" });
          return;
        }

        const [lines] = (await conn.execute(
          "SELECT product_id, size_id, quantity FROM order_items WHERE order_id = ?",
          [orderId]
        )) as unknown as [Array<{ product_id: number; size_id: number | null; quantity: number }>, unknown];
        for (const line of lines) {
          await conn.execute(
            `UPDATE inventory SET stock_quantity = stock_quantity + ?
             WHERE product_id = ? AND (size_id = ? OR (size_id IS NULL AND ? IS NULL)) AND deleted_at IS NULL`,
            [line.quantity, line.product_id, line.size_id, line.size_id]
          );
        }

        await conn.execute(`UPDATE orders SET status = 'approved' WHERE order_id = ?`, [orderId]);
        await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, 'approved')", [orderId]);
        if (order.payment_status === "paid") {
          await conn.execute("UPDATE orders SET payment_status = 'refunded' WHERE order_id = ?", [orderId]);
          await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, 'refunded')", [orderId]);
        }

        await conn.commit();
        res.json({ status: "success", message: "Return approved" });
      } catch {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Seller return approval failed");
        res.status(500).json({ status: "error", message: "Failed to approve return" });
      } finally {
        conn.release();
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
      const { brand_name, description, logo_url, banner_url, location, contact_email, phone } = req.body ?? {};
      const strOrNull = (v: unknown): string | null =>
        v == null || v === "" ? null : String(v);

      if (brand_name !== undefined && brand_name !== null && brand_name !== "") {
        const b = String(brand_name).trim();
        if (b.length < 1 || b.length > 255) {
          res.status(400).json({ status: "error", message: "Brand name must be 1-255 characters" });
          return;
        }
      }
      if (description !== undefined && description !== null && description !== "" && String(description).length > 5000) {
        res.status(400).json({ status: "error", message: "Description is too long" });
        return;
      }
      if (logo_url !== undefined && logo_url !== null && logo_url !== "" && String(logo_url).length > 500) {
        res.status(400).json({ status: "error", message: "Logo URL is too long" });
        return;
      }
      if (banner_url !== undefined && banner_url !== null && banner_url !== "" && String(banner_url).length > 500) {
        res.status(400).json({ status: "error", message: "Banner URL is too long" });
        return;
      }
      if (location !== undefined && location !== null && location !== "" && String(location).length > 255) {
        res.status(400).json({ status: "error", message: "Location is too long" });
        return;
      }
      if (contact_email !== undefined && contact_email !== null && contact_email !== "") {
        const ce = String(contact_email).trim();
        if (ce.length > 255 || !EMAIL_RE.test(ce)) {
          res.status(400).json({ status: "error", message: "Invalid contact email" });
          return;
        }
      }
      if (phone !== undefined && phone !== null && phone !== "" && String(phone).length > 50) {
        res.status(400).json({ status: "error", message: "Phone is too long" });
        return;
      }

      try {
        const pool = getPool();
        if (brand_name) {
          await pool.execute("UPDATE users SET brand_name = ? WHERE user_id = ?", [
            String(brand_name).trim(),
            sellerId,
          ]);
        }
        await pool.execute(
          `
          INSERT INTO seller_profiles (seller_id, description, logo_url, banner_url, location, contact_email, phone)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE description = VALUES(description), logo_url = VALUES(logo_url), banner_url = VALUES(banner_url), location = VALUES(location), contact_email = VALUES(contact_email), phone = VALUES(phone)
        `,
          [
            sellerId,
            strOrNull(description),
            strOrNull(logo_url),
            strOrNull(banner_url),
            strOrNull(location),
            contact_email == null || contact_email === "" ? null : String(contact_email).trim(),
            strOrNull(phone),
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
      } catch (error: unknown) {
        console.error("Seller profile update failed");
        const mapped = mapDbError(error, "Failed to update profile");
        res.status(mapped.http === 409 ? 409 : 400).json({
          status: "error",
          message: mapped.http === 409 ? mapped.message : "Failed to update profile",
        });
      }
    })
  );
}
