const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const production = process.env.NODE_ENV === "production";

const common = {
  dialect: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "controle_escala",
  logging: false,
  define: { timestamps: true, underscored: true, freezeTableName: true },
};

if (production) {
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variáveis MySQL ausentes: ${missing.join(", ")}.`);
  if (process.env.DB_USER.toLowerCase() === "root") throw new Error("Não use o usuário root em produção.");
}

module.exports = {
  development: common,
  test: common,
  production: { ...common, dialectOptions: process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {} },
};
