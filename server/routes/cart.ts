import type { Express } from "express";
import { getPool } from "../db";
import { SHIPPING_FEE, SHIPPING_THRESHOLD } from "../config";
import { requireAuth, type AuthedRequest } from "../auth";
import { asyncHandler, parseId, type Row } from "../utils";

const PAYMENT_METHODS = new Set(["cod", "gcash", "paymaya"]);

export function registerCartRoutes(app: Express): void {
  app.get(
    "/api/cart",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;

      const [items] = (await getPool().execute(
        `
        SELECT c.*, p.product_name as name, p.base_price as price, p.image_url,
                (SELECT stock_quantity FROM inventory WHERE product_id = p.product_id AND (size_id = c.size_id OR (c.size_id IS NULL AND size_id IS NULL)) AND deleted_at IS NULL LIMIT 1) as stock_quantity
        FROM cart_items c
        JOIN products p ON c.product_id = p.product_id
        WHERE c.user_id = ?
      `,
        [user.user_id]
      )) as unknown as [Row[], unknown];
      const total = (items as Array<Row & { price: number; quantity: number }>).reduce(
        (sum: number, item) => sum + Number(item.price) * Number(item.quantity),
        0
      );
      res.json({ status: "success", data: { items, total } });
    })
  );

  app.post(
    "/api/cart/add",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const { product_id, quantity, size_id } = req.body ?? {};

      const productId = Number(product_id);
      const qty = Number(quantity);
      const sizeId = size_id === undefined || size_id === null || size_id === "" ? null : Number(size_id);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(qty) || qty < 1 || qty > 99) {
        res.status(400).json({ status: "error", message: "Invalid product or quantity" });
        return;
      }
      if (sizeId !== null && (!Number.isInteger(sizeId) || sizeId <= 0)) {
        res.status(400).json({ status: "error", message: "Invalid size" });
        return;
      }

      const pool = getPool();
      const [prodRows] = (await pool.execute(
        "SELECT 1 FROM products WHERE product_id = ? AND status = 'active' AND deleted_at IS NULL",
        [productId]
      )) as unknown as [Row[], unknown];
      if (prodRows.length === 0) {
        res.status(404).json({ status: "error", message: "Product not found" });
        return;
      }
      if (sizeId !== null) {
        const [sizeRows] = (await pool.execute("SELECT 1 FROM sizes WHERE size_id = ?", [
          sizeId,
        ])) as unknown as [Row[], unknown];
        if (sizeRows.length === 0) {
          res.status(400).json({ status: "error", message: "Invalid size" });
          return;
        }
      }

      const [existingRows] = (await pool.execute(
        "SELECT cart_item_id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND (size_id = ? OR (size_id IS NULL AND ? IS NULL))",
        [user.user_id, productId, sizeId, sizeId]
      )) as unknown as [Array<{ cart_item_id: number; quantity: number }>, unknown];
      const existing = existingRows[0];

      if (existing) {
        const merged = Number(existing.quantity) + qty;
        if (merged > 99) {
          res.status(400).json({ status: "error", message: "Quantity must be between 1 and 99" });
          return;
        }
        await pool.execute("UPDATE cart_items SET quantity = quantity + ? WHERE cart_item_id = ?", [
          qty,
          existing.cart_item_id,
        ]);
      } else {
        await pool.execute(
          "INSERT INTO cart_items (user_id, product_id, size_id, quantity) VALUES (?, ?, ?, ?)",
          [user.user_id, productId, sizeId, qty]
        );
      }
      res.json({ status: "success", message: "Added to cart" });
    })
  );

  app.put(
    "/api/cart/update",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const cartId = parseId(req.query.id);
      const { quantity } = req.body ?? {};
      const qty = Number(quantity);
      if (cartId === null || !Number.isInteger(qty) || qty < 1 || qty > 99) {
        res.status(400).json({ status: "error", message: cartId === null ? "Invalid ID" : "Invalid cart item or quantity" });
        return;
      }
      const [result] = (await getPool().execute(
        "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND user_id = ?",
        [qty, cartId, user.user_id]
      )) as unknown as [{ affectedRows: number }, unknown];
      if (result.affectedRows === 0) {
        res.status(404).json({ status: "error", message: "Cart item not found" });
        return;
      }
      res.json({ status: "success", message: "Cart updated" });
    })
  );

  app.delete(
    "/api/cart/remove",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const cartId = parseId(req.query.id);
      if (cartId === null) {
        res.status(400).json({ status: "error", message: "Invalid ID" });
        return;
      }
      const [result] = (await getPool().execute("DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?", [
        cartId,
        user.user_id,
      ])) as unknown as [{ affectedRows: number }, unknown];
      if (result.affectedRows === 0) {
        res.status(404).json({ status: "error", message: "Cart item not found" });
        return;
      }
      res.json({ status: "success", message: "Item removed" });
    })
  );

  app.post(
    "/api/checkout",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as AuthedRequest).user!;
      const { shipping_address, payment_method } = req.body ?? {};
      if (
        typeof shipping_address !== "string" ||
        shipping_address.trim().length < 5 ||
        shipping_address.trim().length > 1000 ||
        typeof payment_method !== "string"
      ) {
        res.status(400).json({ status: "error", message: "Shipping address and payment method are required" });
        return;
      }
      const address = shipping_address.trim();
      const pm = payment_method.trim().toLowerCase();
      if (!PAYMENT_METHODS.has(pm)) {
        res.status(400).json({ status: "error", message: "Invalid payment method" });
        return;
      }
      const pool = getPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [cartItems] = (await conn.execute(
          `
          SELECT c.*, p.base_price
          FROM cart_items c
          JOIN products p ON c.product_id = p.product_id
          WHERE c.user_id = ? AND p.deleted_at IS NULL AND p.status = 'active'
        `,
          [user.user_id]
        )) as unknown as [Array<Row & { product_id: number; size_id: number | null; quantity: number; base_price: number }>, unknown];

        if (cartItems.length === 0) {
          await conn.rollback();
          res.status(400).json({ status: "error", message: "Cart is empty" });
          return;
        }

        for (const item of cartItems) {
          const [invRows] = (await conn.execute(
            `
            SELECT stock_quantity
            FROM inventory
            WHERE product_id = ? AND (size_id = ? OR (size_id IS NULL AND ? IS NULL)) AND deleted_at IS NULL
          `,
            [item.product_id, item.size_id, item.size_id]
          )) as unknown as [Array<{ stock_quantity: number }>, unknown];
          const inventory = invRows[0];

          if (!inventory || inventory.stock_quantity < item.quantity) {
            await conn.rollback();
            res
              .status(409)
              .json({ status: "error", message: `Insufficient stock for product. Available: ${inventory?.stock_quantity || 0}` });
            return;
          }
        }

        const subtotal = cartItems.reduce(
          (sum: number, item) => sum + Number(item.base_price) * Number(item.quantity),
          0
        );
        const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
        const total = subtotal + shipping;

        const [orderResult] = (await conn.execute(
          "INSERT INTO orders (user_id, total_amount, shipping_fee, shipping_address, payment_method) VALUES (?, ?, ?, ?, ?)",
          [user.user_id, total, shipping, address, pm]
        )) as unknown as [{ insertId: number }, unknown];
        const orderId = orderResult.insertId;

        await conn.execute("INSERT INTO order_status_history (order_id, status) VALUES (?, ?)", [orderId, "pending"]);

        for (const item of cartItems) {
          await conn.execute(
            "INSERT INTO order_items (order_id, product_id, size_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)",
            [orderId, item.product_id, item.size_id, item.quantity, item.base_price]
          );

          const [updateResult] = (await conn.execute(
            `
            UPDATE inventory
            SET stock_quantity = stock_quantity - ?
            WHERE product_id = ?
            AND (size_id = ? OR (size_id IS NULL AND ? IS NULL))
            AND stock_quantity >= ?
            AND deleted_at IS NULL
          `,
            [item.quantity, item.product_id, item.size_id, item.size_id, item.quantity]
          )) as unknown as [{ affectedRows: number }, unknown];

          if (updateResult.affectedRows === 0) {
            await conn.rollback();
            res.status(409).json({ status: "error", message: "Insufficient stock during processing" });
            return;
          }
        }

        await conn.execute("DELETE FROM cart_items WHERE user_id = ?", [user.user_id]);
        await conn.commit();

        res.json({
          status: "success",
          data: {
            order_id: orderId,
            subtotal,
            shipping,
            total,
            freeShippingThreshold: SHIPPING_THRESHOLD,
            standardShippingFee: SHIPPING_FEE,
          },
        });
      } catch {
        try {
          await conn.rollback();
        } catch {
          // ignore
        }
        console.error("Checkout failed");
        res.status(400).json({ status: "error", message: "Checkout failed" });
      } finally {
        conn.release();
      }
    })
  );
}
