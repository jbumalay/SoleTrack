import mysql from "mysql2/promise";
import { config } from "./config";

let pool: mysql.Pool | undefined;

export function getPool(): mysql.Pool {
  if (!pool) throw new Error("DB pool not initialized. Call initDb() first.");
  return pool;
}

/** Create database (if needed), connection pool, and all tables. Idempotent. */
export async function initDb(): Promise<void> {
  const { dbHost: host, dbPort: port, dbUser: user, dbPass: password, dbName } = config;

  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error("Invalid DB_NAME: only letters, numbers, and underscore are allowed");
  }

  const bootstrap = await mysql.createConnection({ host, port, user, password });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrap.end();
  }

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      brand_name VARCHAR(255),
      first_name VARCHAR(50),
      last_name VARCHAR(50),
      role ENUM('customer', 'seller', 'admin') NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      deleted_at DATETIME NULL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_profiles (
      seller_id INT PRIMARY KEY,
      description TEXT,
      logo_url VARCHAR(500),
      banner_url VARCHAR(500),
      location VARCHAR(255),
      contact_email VARCHAR(255),
      phone VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(255) NOT NULL,
      description TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sizes (
      size_id INT AUTO_INCREMENT PRIMARY KEY,
      size_value VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      product_id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NOT NULL,
      category_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      description TEXT,
      base_price DECIMAL(10, 2) NOT NULL,
      image_url TEXT,
      status VARCHAR(20) DEFAULT 'active',
      deleted_at DATETIME NULL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(user_id),
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      inventory_id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      size_id INT NOT NULL,
      stock_quantity INT DEFAULT 0,
      deleted_at DATETIME NULL DEFAULT NULL,
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (size_id) REFERENCES sizes(size_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT NULL,
      customer_name VARCHAR(255) NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // One review per user per product. MySQL UNIQUE allows multiple NULLs,
  // so legacy seed rows (user_id NULL) are unaffected. Idempotent: dedupe dirty
  // dev DBs (keep earliest review_id), then add the key only if missing.
  await pool.query(`
    DELETE r1 FROM reviews r1
    JOIN reviews r2
      ON r1.product_id = r2.product_id
      AND r1.user_id = r2.user_id
      AND r1.user_id IS NOT NULL
      AND r1.review_id > r2.review_id
  `);
  const [uqRows] = (await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'uq_reviews_product_user'
     LIMIT 1`,
    [dbName]
  )) as unknown as [Array<Record<string, unknown>>, unknown];
  if (uqRows.length === 0) {
    await pool.query(`ALTER TABLE reviews ADD UNIQUE KEY uq_reviews_product_user (product_id, user_id)`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      size_id INT,
      quantity INT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (size_id) REFERENCES sizes(size_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      shipping_fee DECIMAL(10, 2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      payment_status VARCHAR(20) DEFAULT 'unpaid',
      shipping_address TEXT,
      payment_method VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      size_id INT,
      quantity INT NOT NULL,
      price_at_purchase DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (size_id) REFERENCES sizes(size_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      history_id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      promo_code_id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      discount_type ENUM('percent', 'fixed') NOT NULL,
      discount_value DECIMAL(10, 2) NOT NULL,
      min_subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
      expires_at DATETIME NULL DEFAULT NULL,
      usage_limit INT NULL DEFAULT NULL,
      used_count INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Checkout discount columns. Idempotent: add only when missing so existing
  // local DBs upgrade on next boot. No FK — promos stay deletable and past
  // orders keep their discount_amount.
  const [promoIdCol] = (await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'promo_code_id'
     LIMIT 1`,
    [dbName]
  )) as unknown as [Array<Record<string, unknown>>, unknown];
  if (promoIdCol.length === 0) {
    await pool.query(`ALTER TABLE orders ADD COLUMN promo_code_id INT NULL DEFAULT NULL`);
  }
  const [discountCol] = (await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_amount'
     LIMIT 1`,
    [dbName]
  )) as unknown as [Array<Record<string, unknown>>, unknown];
  if (discountCol.length === 0) {
    await pool.query(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
}
