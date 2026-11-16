import { Router } from "express";
import { verifyToken, authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { syncSchema } from "../validators/auth.validator.js";
import { sync, me } from "../controllers/auth.controller.js";

const router = Router();

router.post("/sync", verifyToken, validate(syncSchema), sync);
router.get("/me", authenticate, me);

export default router;