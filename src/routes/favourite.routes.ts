import { Router } from "express";
import * as controller from "../controllers/favourite.controller";
import { authenticate } from "../middlewares/auth";
import { projectAccess } from "../middlewares/projectAccess";
import { validate } from "../middlewares/validate";
import { ALL_ROLES } from "../models/enums";
import { favouriteParamsSchema } from "../validators/favourite.validator";

// POST /project/:projectId/favorite
export const projectFavoriteRouter = Router({ mergeParams: true });
projectFavoriteRouter.use(authenticate);
projectFavoriteRouter.post(
  "/",
  validate({ params: favouriteParamsSchema }),
  projectAccess(ALL_ROLES),
  controller.toggle,
);

// GET /favorite
export const favoriteListRouter = Router();
favoriteListRouter.use(authenticate);
favoriteListRouter.get("/", controller.list);
