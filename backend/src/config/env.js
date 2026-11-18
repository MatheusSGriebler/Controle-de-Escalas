const jwtSecret = process.env.JWT_SECRET;

if (typeof jwtSecret !== "string" || jwtSecret.length < 32 || jwtSecret.startsWith("replace-")) {
  throw new Error("Configure JWT_SECRET com pelo menos 32 caracteres aleatórios.");
}

if (process.env.NODE_ENV === "production") {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}.`);
  if (process.env.DB_USER.toLowerCase() === "root") {
    throw new Error("Use um usuário MySQL sem privilégios de root em produção.");
  }
  if (!(process.env.CORS_ORIGINS || "").trim()) {
    throw new Error("Configure CORS_ORIGINS com o domínio do frontend.");
  }
}
