
import express from "express";
import { authenticate } from "../middlewares/auth";
import { orgContext } from "../middlewares/orgContext";
import { requireRole } from "../middlewares/rbac";
import organizationValidator from "../validators/organization.validator";
import { organizationController } from "../controllers/organization.controller";

const organizationRouter = express.Router();

organizationRouter.use(authenticate);
organizationRouter.post("/", organizationValidator.create, organizationController.create);
organizationRouter.use(orgContext);
organizationRouter.get("/", organizationController.getMine);
organizationRouter.patch("/", requireRole("owner", "admin"), organizationValidator.update, organizationController.update);
organizationRouter.delete("/", requireRole("owner"), organizationController.remove);
organizationRouter.get("/members", requireRole("owner", "admin"), organizationController.getMembers);
organizationRouter.post("/members", requireRole("owner", "admin"), organizationValidator.addMember, organizationController.addMember);
organizationRouter.patch("/members/:userId", requireRole("owner", "admin"), organizationValidator.memberIdParams, organizationValidator.changeRole, organizationController.changeRole);
organizationRouter.delete("/members/:userId", requireRole("owner", "admin"), organizationValidator.memberIdParams, organizationController.removeMember);
export default organizationRouter;
