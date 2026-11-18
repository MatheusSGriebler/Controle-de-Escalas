import jwt from "jsonwebtoken";

export default function requireAuth(req, res, next) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Faça login para acessar este recurso." });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    return next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
  }
}
