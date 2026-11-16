
import { Router } from "express";
import { verifyToken, authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { syncSchema } from "../validators/auth.validator.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();
router.post("/sync", verifyToken, validate(syncSchema), authController.sync);
router.get("/me", authenticate, authController.me);

export default router;
