import type { Express } from "express";
import { getPool } from "../db";
import { getAuthenticatedUser, requireAuth, type AuthedRequest } from "../auth";
import { asyncHandler, mapDbError, parseId, type Row } from "../utils";

export function registerOrderRoutes(app: Express): void {
  app.get(
    "/api/orders/my",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const pool = getPool();
      const [orders] = (await pool.execute(
        `
        SELECT order_id, status as order_status, payment_status, total_amount, shipping_address, created_at as order_date
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
        [user.user_id]
      )) as unknown as [Array<Row & { order_id: number; items?: Row[] }>, unknown];

      for (const order of orders) {
        const [items] = (await pool.execute(
          `
          SELECT oi.*, p.product_name, p.image_url, s.size_value
          FROM order_items oi
          JOIN products p ON oi.product_id = p.product_id
          LEFT JOIN sizes s ON oi.size_id = s.size_id
          WHERE oi.order_id = ?
          LIMIT 3
        `,
          [order.order_id]
        )) as unknown as [Row[], unknown];
        order.items = items;
      }
      res.json({ status: "success", data: orders });
    })
  );

  app.get(
    "/api/orders/details",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const pool = getPool();
      const orderId = parseId(req.query.id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const [orderRows] = (await pool.execute(
        `
        SELECT order_id, user_id, status as order_status, payment_status, total_amount, shipping_fee, shipping_address, created_at as order_date
        FROM orders
        WHERE order_id = ?
      `,
        [orderId]
      )) as unknown as [Array<Row & { user_id: number; items?: Row[]; history?: Row[] }>, unknown];
      const order = orderRows[0];

      if (order) {
        if (order.user_id !== user.user_id && user.role !== "admin") {
          const [sellerRows] = (await pool.execute(
            `
            SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = ? AND p.seller_id = ?
          `,
            [orderId, user.user_id]
          )) as unknown as [Row[], unknown];

          if (sellerRows.length === 0) {
            res.status(403).json({ status: "error", message: "Access denied" });
            return;
          }
        }

        const [items] = (await pool.execute(
          `
          SELECT oi.*, p.product_name, p.image_url, s.size_value
          FROM order_items oi
          JOIN products p ON oi.product_id = p.product_id
          LEFT JOIN sizes s ON oi.size_id = s.size_id
          WHERE oi.order_id = ?
        `,
          [orderId]
        )) as unknown as [Row[], unknown];

        order.items = items;

        const [history] = (await pool.execute(
          "SELECT status, created_at as date_updated FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC",
          [orderId]
        )) as unknown as [Row[], unknown];
        order.history = history;

        res.json({ status: "success", data: order });
      } else {
        res.status(404).json({ status: "error", message: "Order not found" });
      }
    })
  );

  app.post(
    "/api/reviews",
    asyncHandler(async (req, res) => {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ status: "error", message: "Login required" });
        return;
      }

      const { product_id, rating, comment } = req.body ?? {};
      if (product_id === undefined || product_id === null || rating === undefined || rating === null) {
        res.status(400).json({ status: "error", message: "Product ID and rating are required" });
        return;
      }
      const productId = Number(product_id);
      if (!Number.isInteger(productId) || productId <= 0) {
        res.status(400).json({ status: "error", message: "Invalid product" });
        return;
      }
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        res.status(400).json({ status: "error", message: "Rating must be between 1 and 5" });
        return;
      }
      if (comment !== undefined && comment !== null && String(comment).length > 2000) {
        res.status(400).json({ status: "error", message: "Comment is too long" });
        return;
      }

      try {
        const pool = getPool();
        const [prodRows] = (await pool.execute(
          "SELECT 1 FROM products WHERE product_id = ? AND deleted_at IS NULL",
          [productId]
        )) as unknown as [Row[], unknown];
        if (prodRows.length === 0) {
          res.status(404).json({ status: "error", message: "Product not found" });
          return;
        }
        const customer_name =
          `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Verified Artisan Patron";

        await pool.execute(
          "INSERT INTO reviews (product_id, user_id, customer_name, rating, comment) VALUES (?, ?, ?, ?, ?)",
          [productId, user.user_id, customer_name, ratingNum, comment == null ? null : String(comment)]
        );

        res.json({ status: "success", message: "Review submitted" });
      } catch (error: unknown) {
        console.error("Review submit failed");
        const mapped = mapDbError(error, "Failed to submit review");
        res.status(mapped.http >= 500 ? 500 : mapped.http).json({
          status: "error",
          message: mapped.http >= 500 ? "Failed to submit review" : mapped.message,
        });
      }
    })
  );

  app.post(
    "/api/orders/simulate",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const orderId = parseId(req.query.id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        let selectQuery: string;
        let selectParams: Array<string | number>;
        if (user.role === "customer") {
          selectQuery = "SELECT status FROM orders WHERE order_id = ? AND user_id = ? FOR UPDATE";
          selectParams = [orderId, user.user_id];
        } else if (user.role === "seller") {
          selectQuery = `
            SELECT DISTINCT o.status
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE o.order_id = ? AND p.seller_id = ? FOR UPDATE
          `;
          selectParams = [orderId, user.user_id];
        } else {
          selectQuery = "SELECT status FROM orders WHERE order_id = ? FOR UPDATE";
          selectParams = [orderId];
        }

        const [orderRows] = (await conn.execute(selectQuery, selectParams)) as unknown as [
          Array<{ status: string }>,
          unknown,
        ];
        const order = orderRows[0];
        if (!order) {
          await conn.rollback();
          res.status(404).json({ status: "error", message: "Order not found" });
          return;
        }

        const statuses = ["pending", "confirmed", "shipped", "delivered"];
        const currentIndex = statuses.indexOf(order.status);

        if (order.status === "cancelled") {
          await conn.rollback();
          res.json({ status: "success", message: "Cannot simulate status for cancelled order" });
          return;
        }

        if (currentIndex !== -1 && currentIndex < statuses.length - 1) {
          const nextStatus = statuses[currentIndex + 1];
          if (user.role === "seller") {
            const [upd] = (await conn.execute(
              `UPDATE orders SET status = ? WHERE order_id = ? AND EXISTS(
                 SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
                 WHERE oi.order_id = orders.order_id AND p.seller_id = ?
               )`,
              [nextStatus, orderId, user.user_id]
            )) as unknown as [{ affectedRows: number }, unknown];
            if (upd.affectedRows === 0) {
              await conn.rollback();
              res.status(404).json({ status: "error", message: "Order not found" });
              return;
            }
          } else if (user.role === "customer") {
            const [upd] = (await conn.execute("UPDATE orders SET status = ? WHERE order_id = ? AND user_id = ?", [
              nextStatus,
              orderId,
              user.user_id,
            ])) as unknown as [{ affectedRows: number }, unknown];
            if (upd.affectedRows === 0) {
              await conn.rollback();
              res.status(404).json({ status: "error", message: "Order not found" });
              return;
            }
          } else {
            // Admin is intentionally unscoped: admins may advance any order.
            await conn.execute("UPDATE orders SET status = ? WHERE order_id = ?", [nextStatus, orderId]);
          }
          await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [
            orderId,
            nextStatus,
          ]);
          await conn.commit();
          res.json({ status: "success", message: `Order updated to ${nextStatus}` });
        } else if (currentIndex === statuses.length - 1) {
          await conn.rollback();
          res.json({ status: "success", message: "Order already delivered" });
        } else {
          await conn.rollback();
          res
            .status(400)
            .json({ status: "error", message: `Cannot simulate next status for current status: ${order.status}` });
        }
      } catch (err) {
        try {
          await conn.rollback();
        } catch {
          // ignore rollback failure
        }
        console.error("Order simulate failed");
        res.status(500).json({ status: "error", message: "Failed to simulate order status" });
      } finally {
        conn.release();
      }
    })
  );

  app.put(
    "/api/orders/cancel",
    asyncHandler(async (req, res) => {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ status: "error", message: "Login required" });
        return;
      }

      const orderId = parseId(req.query.id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [orderRows] = (await conn.execute(
          "SELECT status FROM orders WHERE order_id = ? AND user_id = ? FOR UPDATE",
          [orderId, user.user_id]
        )) as unknown as [Array<{ status: string }>, unknown];
        const order = orderRows[0];
        if (!order) {
          await conn.rollback();
          res.status(404).json({ status: "error", message: "Order not found" });
          return;
        }

        if (["shipped", "delivered", "cancelled"].includes(order.status)) {
          await conn.rollback();
          res
            .status(400)
            .json({ status: "error", message: "Cannot cancel order that is shipped, delivered, or already cancelled" });
          return;
        }

        await conn.execute("UPDATE orders SET status = 'cancelled' WHERE order_id = ? AND user_id = ?", [
          orderId,
          user.user_id,
        ]);
        await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, 'cancelled')", [orderId]);

        await conn.commit();
        res.json({ status: "success", message: "Order cancelled" });
      } catch {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Order cancel failed");
        res.status(500).json({ status: "error", message: "Failed to cancel order" });
      } finally {
        conn.release();
      }
    })
  );

  app.get(
    "/api/payment/history",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const pool = getPool();
      const orderId = parseId(req.query.order_id);
      if (orderId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }

      if (user.role !== "admin") {
        const [ownerCheck] = (await pool.execute("SELECT order_id FROM orders WHERE order_id = ? AND user_id = ?", [
          orderId,
          user.user_id,
        ])) as unknown as [Row[], unknown];
        if (!ownerCheck.length) {
          res.status(403).json({ status: "error", message: "Access denied" });
          return;
        }
      }

      const [history] = (await pool.execute("SELECT * FROM order_status_history WHERE order_id = ?", [
        orderId,
      ])) as unknown as [Row[], unknown];
      res.json({ status: "success", data: history });
    })
  );
}
