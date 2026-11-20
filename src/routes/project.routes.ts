import express from "express";
import { authenticate } from "../middlewares/auth";
import { projectAccess } from "../middlewares/projectAccess";
import { validate } from "../middlewares/validate";
import { ALL_ROLES } from "../models/enums";
import projectMemberRouter from "./projectMember.routes";
import { projectFavoriteRouter } from "./favourite.routes";
import invitationRouter from "./invitation.routes";
import { workspaceContext } from "../middlewares/workspaceAccess";


import {
  create,
  getProjects,
  getOne,
  update,
  remove,
} from "../controllers/project.controller";

import {
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
} from "../validators/project.validator";

const projectRouter = express.Router();

// only authentication now (no workspaceContext)
projectRouter.use(authenticate, workspaceContext());

// list the projects where the user is a member
projectRouter.get("/", getProjects);

projectRouter.post("/", validate({ body: createProjectSchema }), create);

projectRouter.use("/:projectId/members", projectMemberRouter);
projectRouter.use("/:projectId/invitations", invitationRouter);
projectRouter.use("/:projectId/favorite", projectFavoriteRouter);

projectRouter.get(
  "/:projectId",
  validate({ params: projectIdSchema }),
  projectAccess(ALL_ROLES),
  getOne,
);

projectRouter.patch(
  "/:projectId",
  validate({ body: updateProjectSchema, params: projectIdSchema }),
  projectAccess(["admin"]),
  update,
);

projectRouter.delete(
  "/:projectId",
  validate({ params: projectIdSchema }),
  projectAccess(["admin"]),
  remove,
);



export default projectRouter;
