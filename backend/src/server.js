import "dotenv/config";
import "./config/env.js";
import cors from "cors";
import express from "express";
import pool from "./config/database.js";
import routes from "./routes.js";
import { handleError, notFound } from "./middlewares/error.js";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1) throw new Error("TRUST_PROXY_HOPS deve ser inteiro positivo.");
  app.set("trust proxy", hops);
}
app.use(cors({ origin(origin, callback) {
  if (!origin || (!allowedOrigins.length && process.env.NODE_ENV !== "production") || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Origem não permitida pelo CORS."));
} }));
app.use(express.json({ limit: "32kb" }));
app.use(routes);
app.use(notFound);
app.use(handleError);

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`API Controle de Escala ouvindo na porta ${port}`));

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
