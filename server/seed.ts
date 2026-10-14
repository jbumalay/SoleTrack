import bcrypt from "bcryptjs";
import { getPool } from "./db";
import { SHIPPING_FEE, SHIPPING_THRESHOLD } from "./config";

/** Seed demo users, catalog, inventory, reviews, and orders. Idempotent-ish:
 *  users are inserted only when their email is absent; catalog/orders seed only
 *  when the categories table is empty (verbatim behavior from the monolith).
 *  NOTE: seed passwords (admin123/seller123/customer123) are weak by design
 *  for a local academic demo — never use these in a real deployment. */
export async function seedData(): Promise<void> {
  const pool = getPool();

  const seedUser = async (
    username: string,
    email: string,
    pass: string,
    role: string,
    brand?: string | null,
    firstName?: string | null,
    lastName?: string | null
  ): Promise<void> => {
    const [rows] = (await pool.execute("SELECT 1 FROM users WHERE email = ?", [
      email,
    ])) as unknown as [Array<Record<string, unknown>>, unknown];
    if (rows.length === 0) {
      const hash = await bcrypt.hash(pass, 10);
      await pool.execute(
        "INSERT INTO users (username, email, password_hash, role, status, brand_name, first_name, last_name) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
        [username, email, hash, role, brand ?? null, firstName ?? null, lastName ?? null]
      );
    }
  };

  await seedUser("admin", "admin@soletrack.com", "admin123", "admin", "SoleTrack Admin", null, null);
  await seedUser("bicolartisan", "bicolartisan@soletrack.com", "seller123", "seller", "Bicol Artisan Footwear", "Carlos", "Reyes");
  await seedUser("abacaheritage", "abacaheritage@soletrack.com", "seller123", "seller", "Abaca Heritage Crafts", "Maria", "Santos");
  await seedUser("mayonfootwear", "mayonfootwear@soletrack.com", "seller123", "seller", "Mayon Footwear Co.", "Diego", "Fernandez");
  await seedUser("bicolandiaweaves", "bicolandiaweaves@soletrack.com", "seller123", "seller", "Bicolandia Weaves", "Lourdes", "Bautista");
  await seedUser("juandelacruz", "juan.delacruz@example.com", "customer123", "customer", null, "Juan", "dela Cruz");

  const [catRows] = (await pool.execute(
    "SELECT COUNT(*) as count FROM categories"
  )) as unknown as [Array<{ count: number }>, unknown];
  if (Number(catRows[0].count) === 0) {
    const catNames = ["Traditional", "Woven", "Casual", "Eco-Friendly"];
    const catDescs = [
      "Traditional abaca slippers and native footwear.",
      "Modern woven footwear with heritage patterns.",
      "Casual sandals for everyday comfort.",
      "Sustainable and eco-friendly footwear.",
    ];
    for (let i = 0; i < catNames.length; i++) {
      await pool.execute("INSERT INTO categories (category_name, description) VALUES (?, ?)", [catNames[i], catDescs[i]]);
    }

    for (const val of ["5", "6", "7", "8", "9", "10", "11", "12"]) {
      await pool.execute("INSERT INTO sizes (size_value) VALUES (?)", [val]);
    }

    const sizeRowsAll = (await pool.execute(
      "SELECT size_id FROM sizes ORDER BY size_id ASC"
    )) as unknown as [Array<{ size_id: number }>, unknown];
    if (!Array.isArray(sizeRowsAll[0]) || sizeRowsAll[0].length < 8) {
      throw new Error("Seed failed: expected at least 8 sizes");
    }
    const sizeId7 = sizeRowsAll[0][2].size_id;
    const sizeId8 = sizeRowsAll[0][3].size_id;
    const sizeId9 = sizeRowsAll[0][4].size_id;
    const sizeId10 = sizeRowsAll[0][5].size_id;
    const selectedSizeIds = [sizeId7, sizeId8, sizeId9, sizeId10];

    const [catIdRows] = (await pool.execute(
      "SELECT category_id FROM categories ORDER BY category_id ASC"
    )) as unknown as [Array<{ category_id: number }>, unknown];
    const cId = (idx: number): number => catIdRows[idx].category_id;

    const getSellerId = async (email: string): Promise<number> => {
      const [rows] = (await pool.execute("SELECT user_id FROM users WHERE email = ?", [
        email,
      ])) as unknown as [Array<{ user_id: number }>, unknown];
      return rows[0].user_id;
    };

    const sBicol = await getSellerId("bicolartisan@soletrack.com");
    const sAbaca = await getSellerId("abacaheritage@soletrack.com");
    const sMayon = await getSellerId("mayonfootwear@soletrack.com");
    const sWeaves = await getSellerId("bicolandiaweaves@soletrack.com");

    await pool.execute("INSERT IGNORE INTO seller_profiles (seller_id, description, logo_url, banner_url, location, contact_email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [sBicol, "Bicol Artisan Footwear brings the soul of the Bicol region to every step. Handcrafted by master artisans using traditional abaca weaving techniques passed down through generations.", "https://images.pexels.com/photos/1181565/pexels-photo-1181565.jpeg?auto=compress&cs=tinysrgb&w=300", "https://images.pexels.com/photos/772478/pexels-photo-772478.jpeg?auto=compress&cs=tinysrgb&w=1200", "Legazpi City, Albay", "bicolartisan@soletrack.com", "+63 912 345 6789"]);
    await pool.execute("INSERT IGNORE INTO seller_profiles (seller_id, description, logo_url, banner_url, location, contact_email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [sAbaca, "Abaca Heritage Crafts celebrates the timeless art of abaca fiber weaving. Every product tells a story of sustainable craftsmanship rooted in centuries of Bicolano tradition.", "https://images.pexels.com/photos/1058774/pexels-photo-1058774.jpeg?auto=compress&cs=tinysrgb&w=300", "https://images.pexels.com/photos/101891/pexels-photo-101891.jpeg?auto=compress&cs=tinysrgb&w=1200", "Naga City, Camarines Sur", "abacaheritage@soletrack.com", "+63 915 678 1234"]);
    await pool.execute("INSERT IGNORE INTO seller_profiles (seller_id, description, logo_url, banner_url, location, contact_email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [sMayon, "Mayon Footwear Co. draws inspiration from the majestic Mayon Volcano. Our designs blend volcanic earth tones with modern comfort for the adventurous spirit.", "https://images.pexels.com/photos/26652738/pexels-photo-26652738.jpeg?auto=compress&cs=tinysrgb&w=300", "https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg?auto=compress&cs=tinysrgb&w=1200", "Daraga, Albay", "mayonfootwear@soletrack.com", "+63 917 890 5678"]);
    await pool.execute("INSERT IGNORE INTO seller_profiles (seller_id, description, logo_url, banner_url, location, contact_email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)", [sWeaves, "Bicolandia Weaves brings the vibrant textile heritage of the Bicol region to contemporary footwear. Each pair features hand-embroidered patterns inspired by local culture.", "https://images.pexels.com/photos/15776449/pexels-photo-15776449.jpeg?auto=compress&cs=tinysrgb&w=300", "https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1200", "Iriga City, Camarines Sur", "bicolandiaweaves@soletrack.com", "+63 919 234 5678"]);

    const pexels = (id: number): string =>
      `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop`;

    const products = [
      { seller_id: sBicol, cat_id: cId(0), name: "Classic Abaca Slipper", desc: "Traditional handcrafted abaca slippers, the soul of Bicolano footwear.", price: 250.00, img: pexels(6651966) },
      { seller_id: sBicol, cat_id: cId(3), name: "Tropical Native Sandal", desc: "Eco-friendly summer sandals made from recycled materials and abaca.", price: 450.00, img: pexels(33801366) },
      { seller_id: sBicol, cat_id: cId(1), name: "Heritage Woven Loafer", desc: "Infusing modern loafer design with intricate traditional weaving patterns.", price: 1250.00, img: pexels(825890) },
      { seller_id: sBicol, cat_id: cId(2), name: "Coastal Breeze Flip-flop", desc: "The ultimate casual slipper for shoreline walks and relaxed days.", price: 180.00, img: pexels(4996974) },
      { seller_id: sBicol, cat_id: cId(1), name: "Pinangat Print Espadrilles", desc: "Inspired by the spicy Bicolano dish, these espadrilles feature a bold pepper-red weave.", price: 680.00, img: pexels(2918562) },
      { seller_id: sBicol, cat_id: cId(2), name: "Abaca Weekend Slides", desc: "Lightweight slides perfect for weekend market trips across Legazpi.", price: 320.00, img: pexels(13696789) },
      { seller_id: sAbaca, cat_id: cId(0), name: "Hand-Loomed House Slippers", desc: "Plush abaca house slippers hand-loomed by Bicolano weavers using century-old techniques.", price: 290.00, img: pexels(7671670) },
      { seller_id: sAbaca, cat_id: cId(1), name: "Abaca & Leather Mules", desc: "A refined fusion of abaca fiber and genuine leather for modern artisan style.", price: 850.00, img: pexels(27204298) },
      { seller_id: sAbaca, cat_id: cId(0), name: "Bakya-Inspired Wooden Clogs", desc: "A contemporary take on the traditional Filipino bakya, carved from sustainable local wood.", price: 550.00, img: pexels(4277934) },
      { seller_id: sMayon, cat_id: cId(2), name: "Mayon Sunrise Sandals", desc: "Inspired by the golden sunrise over Mayon Volcano, crafted for comfort and style.", price: 420.00, img: pexels(26652738) },
      { seller_id: sMayon, cat_id: cId(2), name: "Albay Trail Hiking Sandals", desc: "Durable hiking sandals designed for the volcanic trails and rocky terrain of Albay.", price: 990.00, img: pexels(2385477) },
      { seller_id: sMayon, cat_id: cId(3), name: "Legazpi City Walkers", desc: "Eco-conscious city walkers made from recycled rubber and sustainable abaca blends.", price: 1200.00, img: pexels(3217370) },
      { seller_id: sWeaves, cat_id: cId(1), name: "Pili Nut Design Loafers", desc: "Elegant loafers featuring hand-embroidered pili nut shell patterns, a Bicol icon.", price: 1350.00, img: pexels(15776449) },
      { seller_id: sWeaves, cat_id: cId(2), name: "Bicol Striped Sneakers", desc: "Bold striped sneakers inspired by the colorful textiles of the Bicol region.", price: 1450.00, img: pexels(977912) },
      { seller_id: sWeaves, cat_id: cId(0), name: "Inaul Fabric Slides", desc: "Slides adorned with Inaul fabric, celebrating traditional Mindanao weaving reimagined in Bicol.", price: 380.00, img: pexels(12891610) },
    ];

    for (const prod of products) {
      await pool.execute(
        "INSERT INTO products (seller_id, category_id, product_name, description, base_price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [prod.seller_id, prod.cat_id, prod.name, prod.desc, prod.price, prod.img]
      );
    }

    const [productRows] = (await pool.execute(
      "SELECT product_id FROM products ORDER BY product_id ASC"
    )) as unknown as [Array<{ product_id: number }>, unknown];

    const stockMap: Record<number, number[]> = {
      5: [15, 22, 18, 12],
      6: [20, 25, 15, 10],
      7: [12, 18, 24, 20],
      8: [8, 15, 12, 6],
      9: [10, 14, 18, 10],
      10: [25, 30, 20, 15],
      11: [10, 12, 15, 8],
      12: [6, 10, 14, 12],
      13: [8, 12, 16, 10],
      14: [10, 15, 20, 12],
      15: [20, 25, 18, 15],
    };

    for (let pi = 0; pi < productRows.length; pi++) {
      const pid = productRows[pi].product_id;
      const stocks = stockMap[pi + 1] || [15, 15, 15, 15];
      for (let si = 0; si < selectedSizeIds.length; si++) {
        await pool.execute(
          "INSERT INTO inventory (product_id, size_id, stock_quantity) VALUES (?, ?, ?)",
          [pid, selectedSizeIds[si], stocks[si]]
        );
      }
    }

    const reviews = [
      { pid: productRows[0].product_id, name: "Artisan Collector", rating: 5, comment: "Authentic feel and amazing comfort.", days: 30 },
      { pid: productRows[0].product_id, name: "Echo Buyer", rating: 4, comment: "Lovely craftsmanship. Slightly narrow.", days: 20 },
      { pid: productRows[4].product_id, name: "Bicol Foodie", rating: 5, comment: "The prints remind me of home — bold and beautiful!", days: 15 },
      { pid: productRows[6].product_id, name: "Weave Enthusiast", rating: 5, comment: "My abuelita would absolutely approve.", days: 12 },
      { pid: productRows[6].product_id, name: "Tourist from Manila", rating: 4, comment: "A bit stiff at first but softens beautifully after a week.", days: 8 },
      { pid: productRows[8].product_id, name: "Heritage Lover", rating: 5, comment: "Finally someone modernized the bakya. Brilliant.", days: 10 },
      { pid: productRows[9].product_id, name: "Beach Goer", rating: 5, comment: "Comfortable for long walks on the sand.", days: 6 },
      { pid: productRows[10].product_id, name: "Hiker Juan", rating: 4, comment: "Great grip on volcanic trail paths.", days: 4 },
      { pid: productRows[12].product_id, name: "Office Worker", rating: 5, comment: "Gets compliments every single day at the office.", days: 3 },
      { pid: productRows[13].product_id, name: "Fashion Forward", rating: 4, comment: "Love the stripes. Runs slightly small though.", days: 2 },
    ];

    for (const r of reviews) {
      await pool.execute(
        "INSERT INTO reviews (product_id, customer_name, rating, comment, created_at) VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
        [r.pid, r.name, r.rating, r.comment, r.days]
      );
    }

    const [customerRows] = (await pool.execute("SELECT user_id FROM users WHERE email = ?", [
      "juan.delacruz@example.com",
    ])) as unknown as [Array<{ user_id: number }>, unknown];
    const customerId = customerRows[0].user_id;

    const addresses = [
      "123 Magallanes Street, Legazpi City, Albay, 4500",
      "45 Peñaranda Street, Naga City, Camarines Sur, 4400",
      "78 Rizal Avenue, Tabaco City, Albay, 4511",
      "12 Maharlika Highway, Daraga, Albay, 4501",
      "56 Quezon Boulevard, Iriga City, Camarines Sur, 4431",
    ];
    const addr = (i: number): string => `Juan dela Cruz, ${addresses[i % addresses.length]}`;

    const p = (idx: number): number => productRows[idx].product_id;
    const price = (idx: number): number => products[idx].price;

    const orders: Array<{
      days: number;
      status: string;
      pay: string;
      items: number[][];
    }> = [
      { days: 28, status: "delivered", pay: "cod", items: [[p(0), 2, price(0)], [p(2), 1, price(2)]] },
      { days: 25, status: "delivered", pay: "gcash", items: [[p(1), 3, price(1)]] },
      { days: 21, status: "delivered", pay: "paymaya", items: [[p(4), 1, price(4)], [p(5), 2, price(5)]] },
      { days: 18, status: "delivered", pay: "cod", items: [[p(6), 2, price(6)], [p(8), 1, price(8)]] },
      { days: 14, status: "delivered", pay: "gcash", items: [[p(9), 2, price(9)]] },
      { days: 15, status: "cancelled", pay: "gcash", items: [[p(7), 2, price(7)]] },
      { days: 12, status: "shipped", pay: "paymaya", items: [[p(10), 1, price(10)], [p(11), 1, price(11)]] },
      { days: 10, status: "shipped", pay: "cod", items: [[p(12), 1, price(12)], [p(14), 2, price(14)]] },
      { days: 7, status: "confirmed", pay: "gcash", items: [[p(13), 1, price(13)]] },
      { days: 5, status: "pending", pay: "cod", items: [[p(6), 1, price(6)], [p(5), 3, price(5)]] },
      { days: 3, status: "pending", pay: "paymaya", items: [[p(11), 1, price(11)]] },
      { days: 2, status: "pending", pay: "cod", items: [[p(0), 1, price(0)]] },
    ];

    const calcSubtotal = (items: number[][]): number =>
      items.reduce((sum: number, item: number[]) => sum + item[1] * item[2], 0);
    const calcShipping = (subtotal: number): number =>
      subtotal > SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

    for (const order of orders) {
      const subtotal = calcSubtotal(order.items);
      const shipping = calcShipping(subtotal);
      const total = subtotal + shipping;

      await pool.execute(
        "INSERT INTO orders (user_id, total_amount, shipping_fee, status, payment_method, shipping_address, created_at) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
        [customerId, total, shipping, order.status, order.pay, addr(order.days), order.days]
      );

      const [orderResult] = (await pool.execute(
        "SELECT LAST_INSERT_ID() as oid"
      )) as unknown as [Array<{ oid: number }>, unknown];
      const orderId = orderResult[0].oid;

      const statusFlow = ["pending", "confirmed", "shipped", "delivered"];
      const statusIdx = order.status === "cancelled" ? 0 : statusFlow.indexOf(order.status);
      const confirmedDays = Math.max(1, order.days - 3);
      const shippedDays = Math.max(2, order.days - 7);
      const deliveredDays = Math.max(3, order.days - 10);

      if (statusIdx >= 0) {
        await pool.execute(
          "INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
          [orderId, "pending", order.days]
        );
      }
      if (statusIdx >= 1) {
        await pool.execute(
          "INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
          [orderId, "confirmed", confirmedDays]
        );
      }
      if (statusIdx >= 2) {
        await pool.execute(
          "INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
          [orderId, "shipped", shippedDays]
        );
      }
      if (statusIdx >= 3) {
        await pool.execute(
          "INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
          [orderId, "delivered", deliveredDays]
        );
      }
      if (order.status === "cancelled") {
        await pool.execute(
          "INSERT INTO order_status_history (order_id, status, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
          [orderId, "cancelled", order.days]
        );
      }

      for (const item of order.items) {
        await pool.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)",
          [orderId, item[0], item[1], item[2]]
        );
      }
    }
  }
}
