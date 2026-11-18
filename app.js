const API = String(window.CONTROLE_ESCALA_API || "http://localhost:3000").replace(/\/$/, "");
const tokenKey = "controle_escala_token";
let token = sessionStorage.getItem(tokenKey);
const $ = (id) => document.getElementById(id);
const weekdays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== "/api/auth/login") signOut();
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a solicitação.");
  return data;
}

function showApp() {
  $("loginView").hidden = true;
  $("appView").hidden = false;
  loadEmployees();
  loadSchedule();
}

function signOut() {
  token = null;
  sessionStorage.removeItem(tokenKey);
  $("appView").hidden = true;
  $("loginView").hidden = false;
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("loginMessage");
  message.textContent = "Entrando…";
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("loginEmail").value, senha: $("loginPassword").value }),
    });
    token = data.token;
    sessionStorage.setItem(tokenKey, token);
    message.textContent = "";
    showApp();
  } catch (error) { message.textContent = error.message; }
});

$("logoutButton").addEventListener("click", signOut);

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-button").forEach((item) => item.classList.toggle("active", item === button));
  const employees = button.dataset.section === "funcionarios";
  $("funcionariosSection").hidden = !employees;
  $("escalaSection").hidden = employees;
}));

async function loadEmployees() {
  const list = $("employeeList");
  list.innerHTML = "";
  try {
    const { funcionarios } = await api("/api/funcionarios");
    $("employeeCount").textContent = funcionarios.length;
    if (!funcionarios.length) {
      list.innerHTML = '<p class="feedback">Nenhum funcionário cadastrado ainda.</p>';
      return;
    }
    for (const employee of funcionarios) {
      const row = document.createElement("div");
      row.className = "employee-row";
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = employee.nome;
      const role = document.createElement("small");
      role.textContent = employee.cargo;
      details.append(name, role);
      const remove = document.createElement("button");
      remove.className = "remove-button";
      remove.type = "button";
      remove.textContent = "Remover";
      remove.setAttribute("aria-label", `Remover ${employee.nome}`);
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Remover ${employee.nome} permanentemente? As atribuições dele nas escalas geradas também serão apagadas.`)) return;
        try { await api(`/api/funcionarios/${employee.id}`, { method: "DELETE" }); await loadEmployees(); }
        catch (error) { $("employeeMessage").textContent = error.message; }
      });
      row.append(details, remove);
      list.append(row);
    }
  } catch (error) { $("employeeMessage").textContent = error.message; }
}

$("employeeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const feedback = $("employeeMessage");
  feedback.textContent = "";
  const form = new FormData(formElement);
  try {
    await api("/api/funcionarios", {
      method: "POST",
      body: JSON.stringify({ nome: form.get("nome"), cargo: form.get("cargo") }),
    });
    formElement.reset();
    feedback.textContent = "Funcionário cadastrado.";
    feedback.style.color = "#9cd6b0";
    await loadEmployees();
  } catch (error) { feedback.style.color = "#e5a5a5"; feedback.textContent = error.message; }
});

function defaultMonday() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - day);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
$("weekStart").value = defaultMonday();

async function loadSchedule() {
  const message = $("scheduleMessage");
  const start = $("weekStart").value;
  if (!start) return;
  try {
    const data = await api(`/api/escalas?inicioSemana=${encodeURIComponent(start)}`);
    renderSchedule(data.dias);
    message.textContent = data.escala.status === "publicada" ? "Escala publicada." : "Rascunho da escala.";
  } catch (error) {
    renderSchedule();
    message.textContent = error.message.includes("Ainda não existe")
      ? "Ainda não existe escala para essa semana. Gere um rascunho quando a equipe estiver cadastrada."
      : error.message;
  }
}
$("weekStart").addEventListener("change", loadSchedule);

function renderSchedule(days = []) {
  const grid = $("scheduleGrid");
  grid.replaceChildren();
  weekdays.forEach((weekday, index) => {
    const card = document.createElement("article");
    card.className = "day-card";
    const heading = document.createElement("h3");
    heading.textContent = weekday;
    card.append(heading);
    const list = document.createElement("ul");
    const people = days[index]?.funcionarios || [];
    if (!people.length) {
      const item = document.createElement("li");
      item.className = "rest";
      item.textContent = "Sem escala gerada";
      list.append(item);
    } else {
      people.forEach((person) => {
        const item = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = person.nome;
        const role = document.createElement("span");
        role.textContent = `${person.cargoCoberto || person.cargo}${person.tipo === "folga" ? " · Folga" : ""}`;
        item.append(name, role);
        list.append(item);
      });
    }
    card.append(list);
    grid.append(card);
  });
}
renderSchedule();

$("generateButton").addEventListener("click", async () => {
  const button = $("generateButton");
  const message = $("scheduleMessage");
  button.disabled = true;
  message.textContent = "Montando escala…";
  try {
    const data = await api("/api/escalas/gerar", {
      method: "POST",
      body: JSON.stringify({ inicioSemana: $("weekStart").value }),
    });
    message.textContent = data.avisos?.length ? data.avisos.join(" ") : "Rascunho da escala gerado.";
    renderSchedule(data.dias);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

if (token) {
  api("/api/auth/me").then(showApp).catch(() => signOut());
}
