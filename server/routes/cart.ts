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
      const { shipping_address, payment_method, promo_code } = req.body ?? {};
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
      const promoStr =
        promo_code === undefined || promo_code === null
          ? ""
          : String(promo_code).trim().toUpperCase();
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

        let discount = 0;
        let promoId: number | null = null;
        let appliedCode: string | null = null;

        if (promoStr !== "") {
          if (!/^[A-Z0-9_-]{3,50}$/.test(promoStr)) {
            await conn.rollback();
            res.status(400).json({ status: "error", message: "Invalid promo code" });
            return;
          }
          const [promoRows] = (await conn.execute(
            `SELECT promo_code_id, code, discount_type, discount_value, min_subtotal,
                    expires_at, usage_limit, used_count, is_active
             FROM promo_codes WHERE code = ? FOR UPDATE`,
            [promoStr]
          )) as unknown as [
            Array<{
              promo_code_id: number;
              code: string;
              discount_type: string;
              discount_value: number;
              min_subtotal: number;
              expires_at: Date | string | null;
              usage_limit: number | null;
              used_count: number;
              is_active: number;
            }>,
            unknown,
          ];
          const promo = promoRows[0];
          if (!promo) {
            await conn.rollback();
            res.status(400).json({ status: "error", message: "Invalid promo code" });
            return;
          }
          if (!promo.is_active) {
            await conn.rollback();
            res.status(400).json({ status: "error", message: "Promo code is inactive" });
            return;
          }
          if (promo.expires_at !== null && new Date(promo.expires_at).getTime() <= Date.now()) {
            await conn.rollback();
            res.status(400).json({ status: "error", message: "Promo code has expired" });
            return;
          }
          if (promo.usage_limit !== null && Number(promo.used_count) >= Number(promo.usage_limit)) {
            await conn.rollback();
            res.status(400).json({ status: "error", message: "Promo code usage limit reached" });
            return;
          }
          if (subtotal < Number(promo.min_subtotal)) {
            await conn.rollback();
            res.status(400).json({
              status: "error",
              message: `Promo code requires a minimum subtotal of ${Number(promo.min_subtotal)}`,
            });
            return;
          }
          if (promo.discount_type === "percent") {
            discount = Math.round(subtotal * (Number(promo.discount_value) / 100) * 100) / 100;
          } else {
            discount = Math.min(Number(promo.discount_value), subtotal);
            discount = Math.round(discount * 100) / 100;
          }
          promoId = promo.promo_code_id;
          appliedCode = promo.code;
        }

        const discountedSubtotal = Math.round((subtotal - discount) * 100) / 100;
        const shipping = discountedSubtotal > SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
        const total = Math.round((discountedSubtotal + shipping) * 100) / 100;

        const [orderResult] = (await conn.execute(
          "INSERT INTO orders (user_id, total_amount, shipping_fee, shipping_address, payment_method, promo_code_id, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [user.user_id, total, shipping, address, pm, promoId, discount]
        )) as unknown as [{ insertId: number }, unknown];
        const orderId = orderResult.insertId;

        if (promoId !== null) {
          const [promoUpdate] = (await conn.execute(
            `UPDATE promo_codes SET used_count = used_count + 1
             WHERE promo_code_id = ? AND (usage_limit IS NULL OR used_count < usage_limit)`,
            [promoId]
          )) as unknown as [{ affectedRows: number }, unknown];
          if (promoUpdate.affectedRows === 0) {
            await conn.rollback();
            res.status(400).json({ status: "error", message: "Promo code usage limit reached" });
            return;
          }
        }

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
            discount,
            promo_code: appliedCode,
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
