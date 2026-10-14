import type { Express } from "express";
import { getPool } from "../db";
import { getAuthenticatedUser, requireAuth, type AuthedRequest } from "../auth";
import { asyncHandler, type Row } from "../utils";

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
      // Query params are scalar strings from our clients; the cast documents that
      // (no runtime change — exotic array/object values behave exactly as before).
      const { id } = req.query as Record<string, string>;
      const [orderRows] = (await pool.execute(
        `
        SELECT order_id, user_id, status as order_status, payment_status, total_amount, shipping_fee, shipping_address, created_at as order_date
        FROM orders
        WHERE order_id = ?
      `,
        [id]
      )) as unknown as [Array<Row & { user_id: number; items?: Row[]; history?: Row[] }>, unknown];
      const order = orderRows[0];

      if (order) {
        if (order.user_id !== user.user_id && user.role !== "admin") {
          const [sellerRows] = (await pool.execute(
            `
            SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = ? AND p.seller_id = ?
          `,
            [String(id), user.user_id]
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
          [id]
        )) as unknown as [Row[], unknown];

        order.items = items;

        const [history] = (await pool.execute(
          "SELECT status, created_at as date_updated FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC",
          [id]
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
      // Distinct 401 message ("Unauthorized") preserved from the monolith.
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      // Unvalidated JSON body (`any`); validated below before DB use.
      const { product_id, rating, comment } = req.body ?? {};
      if (!product_id || !rating) {
        res.status(400).json({ status: "error", message: "Product ID and rating are required" });
        return;
      }
      const productId = Number(product_id);
      if (!Number.isInteger(productId) || productId <= 0) {
        res.status(400).json({ status: "error", message: "Invalid product" });
        return;
      }
      if (Number(rating) < 1 || Number(rating) > 5) {
        res.status(400).json({ status: "error", message: "Rating must be between 1 and 5" });
        return;
      }

      try {
        const customer_name =
          `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Verified Artisan Patron";

        await getPool().execute(
          "INSERT INTO reviews (product_id, user_id, customer_name, rating, comment) VALUES (?, ?, ?, ?, ?)",
          [productId, user.user_id, customer_name, Number(rating), comment == null ? null : String(comment)]
        );

        res.json({ status: "success", message: "Review submitted" });
      } catch (error: unknown) {
        res
          .status(500)
          .json({ status: "error", message: error instanceof Error ? error.message : "Failed to submit review" });
      }
    })
  );

  app.post(
    "/api/orders/simulate",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const { id } = req.query as Record<string, string>;
      let orderQuery = "SELECT status FROM orders WHERE order_id = ?";
      let orderParams: Array<string | number> = [id];

      if (user.role === "customer") {
        orderQuery += " AND user_id = ?";
        orderParams.push(user.user_id);
      } else if (user.role === "seller") {
        orderQuery = `
          SELECT DISTINCT o.status
          FROM orders o
          JOIN order_items oi ON o.order_id = oi.order_id
          JOIN products p ON oi.product_id = p.product_id
          WHERE o.order_id = ? AND p.seller_id = ?
        `;
        orderParams = [id, user.user_id];
      }

      const [orderRows] = (await getPool().execute(orderQuery, orderParams)) as unknown as [
        Array<{ status: string }>,
        unknown,
      ];
      const order = orderRows[0];
      if (!order) {
        res.status(404).json({ status: "error", message: "Order not found" });
        return;
      }

      const statuses = ["pending", "confirmed", "shipped", "delivered"];
      const currentIndex = statuses.indexOf(order.status);

      if (order.status === "cancelled") {
        res.json({ status: "success", message: "Cannot simulate status for cancelled order" });
        return;
      }

      if (currentIndex !== -1 && currentIndex < statuses.length - 1) {
        const nextStatus = statuses[currentIndex + 1];
        await getPool().execute("UPDATE orders SET status = ? WHERE order_id = ?", [nextStatus, String(id)]);
        await getPool().execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [String(id), nextStatus]);
        res.json({ status: "success", message: `Order updated to ${nextStatus}` });
      } else if (currentIndex === statuses.length - 1) {
        res.json({ status: "success", message: "Order already delivered" });
      } else {
        res
          .status(400)
          .json({ status: "error", message: `Cannot simulate next status for current status: ${order.status}` });
      }
    })
  );

  app.put(
    "/api/orders/cancel",
    asyncHandler(async (req, res) => {
      // Distinct 401 message ("Unauthorized") preserved from the monolith.
      const user = await getAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const { id } = req.query as Record<string, string>;
      if (!id) {
        res.status(400).json({ status: "error", message: "Order ID required" });
        return;
      }

      const pool = getPool();
      const [orderRows] = (await pool.execute("SELECT status FROM orders WHERE order_id = ? AND user_id = ?", [
        String(id),
        user.user_id,
      ])) as unknown as [Array<{ status: string }>, unknown];
      const order = orderRows[0];
      if (!order) {
        res.status(404).json({ status: "error", message: "Order not found" });
        return;
      }

      if (["shipped", "delivered", "cancelled"].includes(order.status)) {
        res
          .status(400)
          .json({ status: "error", message: "Cannot cancel order that is shipped, delivered, or already cancelled" });
        return;
      }

      await pool.execute("UPDATE orders SET status = 'cancelled' WHERE order_id = ?", [String(id)]);
      await pool.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, 'cancelled')", [String(id)]);

      res.json({ status: "success", message: "Order cancelled" });
    })
  );

  app.get(
    "/api/payment/history",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const pool = getPool();
      const { order_id } = req.query as Record<string, string>;

      if (user.role !== "admin") {
        const [ownerCheck] = (await pool.execute("SELECT order_id FROM orders WHERE order_id = ? AND user_id = ?", [
          String(order_id),
          user.user_id,
        ])) as unknown as [Row[], unknown];
        if (!ownerCheck.length) {
          res.status(403).json({ status: "error", message: "Access denied" });
          return;
        }
      }

      const [history] = (await pool.execute("SELECT * FROM order_status_history WHERE order_id = ?", [
        String(order_id),
      ])) as unknown as [Row[], unknown];
      res.json({ status: "success", data: history });
    })
  );
}
