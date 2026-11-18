import pool from "../config/database.js";

const fields = "id, nome, cargo, matricula, ativo, criado_em, atualizado_em";
const cargos = new Set(["Chapista", "Auxiliar de chapista", "Auxiliar de cozinha", "Caixa", "Atendente"]);

function normalizeEmployee(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const allowed = new Set(["nome", "cargo", "matricula", "ativo"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return null;
  const data = {};
  if (!partial || Object.hasOwn(body, "nome")) {
    if (typeof body.nome !== "string" || body.nome.trim().length < 2 || body.nome.trim().length > 120) return null;
    data.nome = body.nome.trim();
  }
  if (!partial || Object.hasOwn(body, "cargo")) {
    if (typeof body.cargo !== "string" || !cargos.has(body.cargo.trim())) return null;
    data.cargo = body.cargo.trim();
  }
  if (Object.hasOwn(body, "matricula")) {
    if (body.matricula !== null && (typeof body.matricula !== "string" || body.matricula.trim().length > 40)) return null;
    data.matricula = body.matricula?.trim() || null;
  }
  if (Object.hasOwn(body, "ativo")) {
    if (typeof body.ativo !== "boolean") return null;
    data.ativo = body.ativo;
  }
  return data;
}

export async function index(req, res) {
  const [rows] = await pool.execute(`SELECT ${fields} FROM funcionarios ORDER BY nome, id`);
  return res.json({ funcionarios: rows });
}

export async function show(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "ID inválido." });
  const [rows] = await pool.execute(`SELECT ${fields} FROM funcionarios WHERE id = ?`, [id]);
  if (!rows[0]) return res.status(404).json({ error: "Funcionário não encontrado." });
  return res.json({ funcionario: rows[0] });
}

export async function store(req, res) {
  const data = normalizeEmployee(req.body);
  if (!data) return res.status(400).json({ error: "Informe nome (2 a 120 caracteres), cargo (2 a 80 caracteres) e matrícula opcional válida." });
  const [result] = await pool.execute(
    "INSERT INTO funcionarios (nome, cargo, matricula) VALUES (?, ?, ?)",
    [data.nome, data.cargo, data.matricula ?? null],
  );
  const [rows] = await pool.execute(`SELECT ${fields} FROM funcionarios WHERE id = ?`, [result.insertId]);
  return res.status(201).json({ funcionario: rows[0] });
}

export async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "ID inválido." });
  const data = normalizeEmployee(req.body, true);
  if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: "Nenhuma alteração válida informada." });
  const [existing] = await pool.execute("SELECT id FROM funcionarios WHERE id = ?", [id]);
  if (!existing[0]) return res.status(404).json({ error: "Funcionário não encontrado." });
  const columns = { nome: "nome", cargo: "cargo", matricula: "matricula", ativo: "ativo" };
  const assignments = Object.keys(data).map((key) => `${columns[key]} = ?`).join(", ");
  await pool.execute(`UPDATE funcionarios SET ${assignments} WHERE id = ?`, [...Object.values(data), id]);
  const [rows] = await pool.execute(`SELECT ${fields} FROM funcionarios WHERE id = ?`, [id]);
  return res.json({ funcionario: rows[0] });
}

export async function destroy(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "ID inválido." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute("SELECT id FROM funcionarios WHERE id = ? FOR UPDATE", [id]);
    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ error: "Funcionário não encontrado." });
    }
    // Remove as atribuições da escala junto com o funcionário para respeitar a FK.
    await connection.execute("DELETE FROM escala_dias WHERE funcionario_id = ?", [id]);
    await connection.execute("DELETE FROM funcionarios WHERE id = ?", [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.status(204).send();
}
