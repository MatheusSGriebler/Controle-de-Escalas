import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, me } from "./controllers/authController.js";
import * as employees from "./controllers/employeesController.js";
import * as coverage from "./controllers/coverageController.js";
import * as schedules from "./controllers/schedulesController.js";
import requireAuth from "./middlewares/auth.js";

const router = Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Aguarde e tente novamente." },
});

router.get("/api/health", (req, res) => res.json({ status: "ok" }));
router.post("/api/auth/login", loginLimit, login);
router.get("/api/auth/me", requireAuth, me);
router.get("/api/funcionarios", requireAuth, employees.index);
router.get("/api/funcionarios/:id", requireAuth, employees.show);
router.post("/api/funcionarios", requireAuth, employees.store);
router.patch("/api/funcionarios/:id", requireAuth, employees.update);
router.delete("/api/funcionarios/:id", requireAuth, employees.destroy);
router.get("/api/configuracao/cobertura", requireAuth, coverage.index);
router.put("/api/configuracao/cobertura", requireAuth, coverage.replace);
router.get("/api/escalas", requireAuth, schedules.show);
router.post("/api/escalas/gerar", requireAuth, schedules.generate);

export default router;
