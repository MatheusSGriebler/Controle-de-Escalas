export function notFound(req, res) {
  res.status(404).json({ error: "Rota não encontrada." });
}

export function handleError(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Requisição muito grande." });
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "JSON inválido." });
  }
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Esse registro já existe." });
  console.error(err);
  return res.status(500).json({ error: "Erro interno do servidor." });
}
