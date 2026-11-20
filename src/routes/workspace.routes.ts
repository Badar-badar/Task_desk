import { Router } from "express";
import * as controller from "../controllers/workspace.controller";
import { authenticate } from "../middlewares/auth";
import { workspaceAccess } from "../middlewares/workspaceAccess";
import { validate } from "../middlewares/validate";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from "../validators/workspace.validator";

const workspaceRouter = Router();
workspaceRouter.use(authenticate);

workspaceRouter.post("/", validate({ body: createWorkspaceSchema }), controller.create);
workspaceRouter.get("/", controller.listMine);

workspaceRouter.get("/:workspaceId", validate({ params: workspaceIdSchema }), workspaceAccess(), controller.getOne);
workspaceRouter.patch(
  "/:workspaceId",
  validate({ params: workspaceIdSchema, body: updateWorkspaceSchema }),
  workspaceAccess(["owner"]),
  controller.update,
);
workspaceRouter.delete("/:workspaceId", validate({ params: workspaceIdSchema }), workspaceAccess(["owner"]), controller.remove);

export default workspaceRouter;