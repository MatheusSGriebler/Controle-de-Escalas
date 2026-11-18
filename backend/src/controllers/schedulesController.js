import pool from "../config/database.js";

const dayNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

function parseJson(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

function mondayDates(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCDay() !== 1) return null;
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(date);
    day.setUTCDate(day.getUTCDate() + offset);
    return day.toISOString().slice(0, 10);
  });
}

function addEdge(graph, from, to, capacity, cost) {
  const forward = { to, rev: graph[to].length, cap: capacity, initial: capacity, cost };
  const reverse = { to: from, rev: graph[from].length, cap: 0, initial: 0, cost: -cost };
  graph[from].push(forward);
  graph[to].push(reverse);
  return forward;
}

function matchRequirements(employees, needsByDay) {
  const slots = [];
  for (let day = 0; day < 7; day++) {
    for (const need of needsByDay[day]) {
      if (need.quantidade > 0) slots.push({ day, need, quantity: need.quantidade });
    }
  }
  const targetFlow = slots.reduce((sum, slot) => sum + slot.quantity, 0);
  const source = 0;
  let next = 1;
  const slotNodes = slots.map(() => next++);
  const employeeDayNodes = employees.map(() => Array.from({ length: 7 }, () => next++));
  const employeeNodes = employees.map(() => next++);
  const sink = next++;
  const graph = Array.from({ length: next }, () => []);
  const assignmentEdges = slots.map(() => []);
  const sourceEdges = [];

  slots.forEach((slot, slotIndex) => {
    sourceEdges[slotIndex] = addEdge(graph, source, slotNodes[slotIndex], slot.quantity, 0);
    const accepted = new Set(slot.need.cargosAceitos);
    employees.forEach((employee, employeeIndex) => {
      if (!accepted.has(employee.cargo)) return;
      const edge = addEdge(graph, slotNodes[slotIndex], employeeDayNodes[employeeIndex][slot.day], 1, 0);
      assignmentEdges[slotIndex].push({ employeeIndex, edge });
    });
  });

  employees.forEach((employee, employeeIndex) => {
    for (let day = 0; day < 7; day++) addEdge(graph, employeeDayNodes[employeeIndex][day], employeeNodes[employeeIndex], 1, 0);
    // Custos marginais crescentes distribuem os turnos entre pessoas do mesmo cargo.
    for (let shift = 0; shift < 5; shift++) addEdge(graph, employeeNodes[employeeIndex], sink, 1, shift * 10);
  });

  let flow = 0;
  while (flow < targetFlow) {
    const distance = Array(next).fill(Infinity);
    const previousNode = Array(next).fill(-1);
    const previousEdge = Array(next).fill(-1);
    const inQueue = Array(next).fill(false);
    const queue = [source];
    distance[source] = 0;
    inQueue[source] = true;
    for (let head = 0; head < queue.length; head++) {
      const node = queue[head];
      inQueue[node] = false;
      for (let edgeIndex = 0; edgeIndex < graph[node].length; edgeIndex++) {
        const edge = graph[node][edgeIndex];
        const candidate = distance[node] + edge.cost;
        if (edge.cap > 0 && candidate < distance[edge.to]) {
          distance[edge.to] = candidate;
          previousNode[edge.to] = node;
          previousEdge[edge.to] = edgeIndex;
          if (!inQueue[edge.to]) { queue.push(edge.to); inQueue[edge.to] = true; }
        }
      }
    }
    if (previousNode[sink] === -1) break;
    let amount = targetFlow - flow;
    for (let node = sink; node !== source; node = previousNode[node]) {
      amount = Math.min(amount, graph[previousNode[node]][previousEdge[node]].cap);
    }
    for (let node = sink; node !== source; node = previousNode[node]) {
      const edge = graph[previousNode[node]][previousEdge[node]];
      edge.cap -= amount;
      graph[node][edge.rev].cap += amount;
    }
    flow += amount;
  }

  const assignments = [];
  slots.forEach((slot, slotIndex) => {
    assignmentEdges[slotIndex].forEach(({ employeeIndex, edge }) => {
      if (edge.initial === 1 && edge.cap === 0) {
        assignments.push({ day: slot.day, employee: employees[employeeIndex], cargoCoberto: slot.need.cargoAlvo });
      }
    });
  });

  const uncovered = slots.flatMap((slot, index) => sourceEdges[index].cap > 0
    ? [{ dia: dayNames[slot.day], cargo: slot.need.cargoAlvo, quantidade: sourceEdges[index].cap }]
    : []);
  return { assignments, uncovered, targetFlow, flow };
}

async function loadWeek(connection, startDate) {
  const [scales] = await connection.execute("SELECT id, status FROM escalas WHERE inicio_semana = ? LIMIT 1", [startDate]);
  if (!scales[0]) return null;
  const [rows] = await connection.execute(
    `SELECT DATE_FORMAT(ed.data, '%Y-%m-%d') AS data, ed.tipo, ed.cargo_coberto AS cargoCoberto,
            f.id AS funcionarioId, f.nome, f.cargo
       FROM escala_dias ed JOIN funcionarios f ON f.id = ed.funcionario_id
      WHERE ed.escala_id = ? ORDER BY ed.data, ed.tipo, f.cargo, f.nome`,
    [scales[0].id],
  );
  return { escala: scales[0], rows };
}

function shapeDays(dates, rows) {
  return dates.map((date, index) => ({
    data: date,
    dia: dayNames[index],
    funcionarios: rows.filter((row) => row.data === date).map((row) => ({
      id: row.funcionarioId,
      nome: row.nome,
      cargo: row.cargo,
      cargoCoberto: row.cargoCoberto,
      tipo: row.tipo,
    })),
  }));
}

export async function show(req, res) {
  const dates = mondayDates(req.query.inicioSemana);
  if (!dates) return res.status(400).json({ error: "inicioSemana deve ser uma segunda-feira no formato AAAA-MM-DD." });
  const result = await loadWeek(pool, dates[0]);
  if (!result) return res.status(404).json({ error: "Ainda não existe escala para essa semana." });
  return res.json({ escala: result.escala, dias: shapeDays(dates, result.rows) });
}

export async function generate(req, res) {
  const dates = mondayDates(req.body?.inicioSemana);
  if (!dates) return res.status(400).json({ error: "inicioSemana deve ser uma segunda-feira no formato AAAA-MM-DD." });

  const [staffRows] = await pool.execute(
    "SELECT id, nome, cargo FROM funcionarios WHERE ativo = 1 ORDER BY cargo, id",
  );
  const [needRows] = await pool.execute(
    "SELECT cargo_alvo AS cargoAlvo, cargos_aceitos AS cargosAceitos, dia_semana AS diaSemana, quantidade FROM necessidades_cobertura ORDER BY dia_semana, id",
  );
  if (!staffRows.length) return res.status(409).json({ error: "Cadastre funcionários antes de gerar a escala." });
  if (!needRows.length) return res.status(409).json({ error: "A cobertura semanal ainda não foi configurada. Execute sql/seed-coverage.sql." });

  const needsByDay = Array.from({ length: 7 }, () => []);
  needRows.forEach((row) => needsByDay[Number(row.diaSemana) - 1].push({
    cargoAlvo: row.cargoAlvo,
    cargosAceitos: parseJson(row.cargosAceitos),
    quantidade: Number(row.quantidade),
  }));
  const matched = matchRequirements(staffRows, needsByDay);
  if (matched.uncovered.length) {
    return res.status(409).json({
      error: "Não há funcionários suficientes por cargo para cobrir todos os dias sem exceder cinco dias de trabalho por pessoa.",
      vagasNaoCobertas: matched.uncovered,
    });
  }

  const assigned = new Map(matched.assignments.map((item) => [`${item.employee.id}:${item.day}`, item]));
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      "SELECT id, status FROM escalas WHERE inicio_semana = ? FOR UPDATE",
      [dates[0]],
    );
    if (existing[0]?.status === "publicada") {
      await connection.rollback();
      return res.status(409).json({ error: "A escala já foi publicada e não pode ser substituída." });
    }
    let scheduleId = existing[0]?.id;
    if (scheduleId) {
      await connection.execute("DELETE FROM escala_dias WHERE escala_id = ?", [scheduleId]);
    } else {
      const [created] = await connection.execute(
        "INSERT INTO escalas (inicio_semana, status, criado_por) VALUES (?, 'rascunho', ?)",
        [dates[0], Number(req.auth.sub)],
      );
      scheduleId = created.insertId;
    }

    const values = [];
    staffRows.forEach((employee) => dates.forEach((date, day) => {
      const assignment = assigned.get(`${employee.id}:${day}`);
      values.push([scheduleId, employee.id, date, assignment ? "trabalho" : "folga", assignment?.cargoCoberto ?? null]);
    }));
    for (let offset = 0; offset < values.length; offset += 300) {
      await connection.query(
        "INSERT INTO escala_dias (escala_id, funcionario_id, data, tipo, cargo_coberto) VALUES ?",
        [values.slice(offset, offset + 300)],
      );
    }
    await connection.commit();
    return res.status(201).json({
      escala: { id: scheduleId, inicio_semana: dates[0], status: "rascunho" },
      dias: shapeDays(dates, values.map(([,, data, tipo, cargoCoberto], index) => ({
        data,
        tipo,
        cargoCoberto,
        funcionarioId: staffRows[Math.floor(index / 7)].id,
        nome: staffRows[Math.floor(index / 7)].nome,
        cargo: staffRows[Math.floor(index / 7)].cargo,
      }))),
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
