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
