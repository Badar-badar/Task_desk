import { Router } from "express";
import * as controller from "../controllers/invitation.controller";
import { authenticate } from "../middlewares/auth";
import { projectAccess } from "../middlewares/projectAccess";
import { validate } from "../middlewares/validate";
import {
  invitationParamsSchema,
  projectInvitationsParamsSchema,
  updateInvitationSchema,
} from "../validators/invitation.validator";

const invitationRouter = Router({ mergeParams: true });

invitationRouter.use(authenticate);

invitationRouter.get(
  "/",
  validate({ params: projectInvitationsParamsSchema }),
  projectAccess(["admin"]),
  controller.list,
);

invitationRouter.patch(
  "/:invitationId",
  validate({ params: invitationParamsSchema, body: updateInvitationSchema }),
  projectAccess(["admin"]),
  controller.updateRole,
);

invitationRouter.delete(
  "/:invitationId",
  validate({ params: invitationParamsSchema }),
  projectAccess(["admin"]),
  controller.revoke,
);

export default invitationRouter;