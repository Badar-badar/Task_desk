
import express from "express";
import { authenticate } from "../middlewares/auth";
import { orgContext } from "../middlewares/orgContext";
import { requireRole } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";

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

projectRouter.use(authenticate, orgContext);

projectRouter.get("/", requireRole("owner", "admin"), getProjects);
projectRouter.get("/:projectId", validate(projectIdSchema), getOne);
projectRouter.post("/", requireRole("owner", "admin"), validate(createProjectSchema), create);
projectRouter.patch("/:projectId", requireRole("owner", "admin"), validate(updateProjectSchema), update);
projectRouter.delete("/:projectId", requireRole("owner", "admin"), validate(projectIdSchema), remove);

export default projectRouter;
