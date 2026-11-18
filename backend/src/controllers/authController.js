import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";

export async function login(req, res) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  if (!email || email.length > 254 || !senha || Buffer.byteLength(senha, "utf8") > 72) {
    return res.status(400).json({ error: "E-mail ou senha inválidos." });
  }

  const [rows] = await pool.execute(
    "SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1",
    [email],
  );
  const user = rows[0];
  const valid = user && await bcrypt.compare(senha, user.senha_hash);
  if (!valid) return res.status(401).json({ error: "E-mail ou senha inválidos." });

  const token = jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    algorithm: "HS256",
  });
  return res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email } });
}

export async function me(req, res) {
  const [rows] = await pool.execute(
    "SELECT id, nome, email FROM usuarios WHERE id = ? AND ativo = 1 LIMIT 1",
    [Number(req.auth.sub)],
  );
  if (!rows[0]) return res.status(401).json({ error: "Conta indisponível." });
  return res.json({ usuario: rows[0] });
}
