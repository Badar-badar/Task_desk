import { Router } from "express";
import * as controller from "../controllers/projectMember.controller";
import { authenticate } from "../middlewares/auth";
import { projectAccess } from "../middlewares/projectAccess";
import { validate } from "../middlewares/validate";
import { ALL_ROLES } from "../models/enums";
import {
  addMemberSchema,
  memberParamsSchema,
  projectMembersParamsSchema,
  updateMemberSchema,
} from "../validators/projectMembe.validator";

// mergeParams so :projectId from the parent path is visible here
const projectMemberRouter = Router({ mergeParams: true });

projectMemberRouter.use(authenticate);

projectMemberRouter.get(
  "/",
  validate({ params: projectMembersParamsSchema }),
  projectAccess(ALL_ROLES),
  controller.list,
);

projectMemberRouter.post(
  "/",
  validate({ params: projectMembersParamsSchema, body: addMemberSchema }),
  projectAccess(["admin"]),
  controller.add,
);

projectMemberRouter.patch(
  "/:userId",
  validate({ params: memberParamsSchema, body: updateMemberSchema }),
  projectAccess(["admin"]),
  controller.updateRole,
);

projectMemberRouter.delete(
  "/:userId",
  validate({ params: memberParamsSchema }),
  projectAccess(ALL_ROLES), // role check for admin-or-self happens in the controller
  controller.remove,
);

export default projectMemberRouter;
