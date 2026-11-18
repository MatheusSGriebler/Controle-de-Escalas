import mysql from "mysql2/promise";

const production = process.env.NODE_ENV === "production";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "controle_escala",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
  ssl: production ? { rejectUnauthorized: true } : undefined,
});

export default pool;
