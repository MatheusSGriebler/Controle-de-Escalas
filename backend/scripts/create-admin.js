import "dotenv/config";
import "../src/config/env.js";
import bcrypt from "bcrypt";
import pool from "../src/config/database.js";

const nome = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const senha = process.env.ADMIN_PASSWORD;

let connection;
try {
  if (!nome || nome.length < 2 || nome.length > 120 || !email || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !senha || Array.from(senha).length < 12 || Buffer.byteLength(senha, "utf8") > 72) {
    throw new Error("Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres; máximo 72 bytes).");
  }
  connection = await pool.getConnection();
  await connection.beginTransaction();
  const [existing] = await connection.execute("SELECT id FROM usuarios LIMIT 1 FOR UPDATE");
  if (existing[0]) throw new Error("A conta inicial já foi criada. O cadastro de usuários está fechado.");
  const hash = await bcrypt.hash(senha, 12);
  await connection.execute("INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)", [nome, email, hash]);
  await connection.commit();
  console.log(`Conta administrativa criada para ${email}.`);
} catch (error) {
  if (connection) await connection.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
