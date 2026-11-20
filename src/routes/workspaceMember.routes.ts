import { Router } from "express";
import * as controller from "../controllers/workspaceMember.controller";
import { authenticate } from "../middlewares/auth";
import { workspaceAccess } from "../middlewares/workspaceAccess";
import { validate } from "../middlewares/validate";
import { workspaceIdSchema } from "../validators/workspace.validator";
import { addWorkspaceMemberSchema, workspaceMemberParamsSchema } from "../validators/workspaceMember.validator";

const workspaceMemberRouter = Router({ mergeParams: true });
workspaceMemberRouter.use(authenticate);

workspaceMemberRouter.get("/", validate({ params: workspaceIdSchema }), workspaceAccess(), controller.list);
workspaceMemberRouter.post(
  "/",
  validate({ params: workspaceIdSchema, body: addWorkspaceMemberSchema }),
  workspaceAccess(["owner"]),
  controller.add,
);
workspaceMemberRouter.delete(
  "/:userId",
  validate({ params: workspaceMemberParamsSchema }),
  workspaceAccess(), 
  controller.remove,
);

export default workspaceMemberRouter;