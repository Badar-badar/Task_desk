import { Router } from "express";
import { getSummary } from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth";
import { workspaceContext } from "../middlewares/workspaceAccess";

const dashboardRouter = Router();

dashboardRouter.use(authenticate, workspaceContext());
dashboardRouter.get("/summary", getSummary);

export default dashboardRouter;
