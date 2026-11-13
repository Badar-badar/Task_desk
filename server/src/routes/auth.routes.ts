import { Router } from "express";
import { verifyToken, authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { syncSchema } from "../validators/auth.validator.js";
import { sync, me } from "../controllers/auth.controller.js";

const router = Router();

// Token only: the user may not exist in our database yet
router.post("/sync", verifyToken, validate(syncSchema), sync);

// Token + user must exist and be active
router.get("/me", authenticate, me);

export default router;