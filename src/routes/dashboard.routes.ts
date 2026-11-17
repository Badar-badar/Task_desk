import { Router } from "express";
import { getSummary } from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth";
import { orgContext } from "../middlewares/orgContext";

const dashboardRouter = Router();

dashboardRouter.use(authenticate, orgContext);
dashboardRouter.get("/summary", getSummary);

export default dashboardRouter;
