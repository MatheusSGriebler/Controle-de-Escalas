import pool from "../config/database.js";

const weekdays = new Set([1, 2, 3, 4, 5, 6, 7]);
const cargos = new Set(["Chapista", "Auxiliar de chapista", "Auxiliar de cozinha", "Caixa", "Atendente"]);

function acceptedRoles(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

export async function index(req, res) {
  const [rows] = await pool.execute(
    "SELECT cargo_alvo AS cargoAlvo, cargos_aceitos AS cargosAceitos, dia_semana AS diaSemana, quantidade FROM necessidades_cobertura ORDER BY dia_semana, cargo_alvo",
  );
  return res.json({ necessidades: rows.map((row) => ({ ...row, cargosAceitos: acceptedRoles(row.cargosAceitos) })) });
}

export async function replace(req, res) {
  const entries = req.body?.necessidades;
  if (!Array.isArray(entries) || entries.length > 100) {
    return res.status(400).json({ error: "Envie necessidades como uma lista de até 100 itens." });
  }

  const seen = new Set();
  const normalized = [];
  for (const entry of entries) {
    const cargoAlvo = typeof entry?.cargoAlvo === "string" ? entry.cargoAlvo.trim() : "";
    const cargosAceitos = Array.isArray(entry?.cargosAceitos) ? [...new Set(entry.cargosAceitos)] : [];
    const dia = Number(entry?.diaSemana);
    const quantidade = Number(entry?.quantidade);
    const key = `${cargoAlvo.toLocaleLowerCase("pt-BR")}:${dia}`;
    if (cargoAlvo.length < 2 || cargoAlvo.length > 80 || !weekdays.has(dia) ||
        !cargosAceitos.length || cargosAceitos.some((role) => !cargos.has(role)) ||
        !Number.isInteger(quantidade) || quantidade < 0 || quantidade > 500 || seen.has(key)) {
      return res.status(400).json({ error: "Cada item precisa de cargoAlvo, cargosAceitos, diaSemana (1=segunda a 7=domingo) e quantidade inteira não negativa, sem duplicatas." });
    }
    seen.add(key);
    normalized.push({ cargoAlvo, cargosAceitos, dia, quantidade });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM necessidades_cobertura");
    if (normalized.length) {
      await connection.query(
        "INSERT INTO necessidades_cobertura (cargo_alvo, cargos_aceitos, dia_semana, quantidade) VALUES ?",
        [normalized.map(({ cargoAlvo, cargosAceitos, dia, quantidade }) => [cargoAlvo, JSON.stringify(cargosAceitos), dia, quantidade])],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.json({ necessidades: normalized.map(({ cargoAlvo, cargosAceitos, dia, quantidade }) => ({ cargoAlvo, cargosAceitos, diaSemana: dia, quantidade })) });
}
