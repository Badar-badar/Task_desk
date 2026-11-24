import {Router} from "express"
import { prisma } from "../config/db";
import authRoutes from './auth.routes'
import workspaceRoutes from './workspace.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes'
import dashboardRoutes from './dashboard.routes'
import { commentRouter } from './comment.routes'
import { favoriteListRouter } from './favourite.routes'
import workspaceMemberRouter from './workspaceMember.routes'
const router = Router();

router.get("/health", async (_req, res) => {
    let db: "connected" | "disconnected" = "connected";
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        db = "disconnected";
    }

    res.status(db === "connected" ? 200 : 503).json({
        status: db === "connected" ? "ok" : "error",
        app: 'Task Desk',
        db,
    });
});

router.use('/auth',authRoutes)
router.use('/workspace',workspaceRoutes); 
router.use('/project',projectRoutes);
router.use('/workspace/:workspaceId/members', workspaceMemberRouter);
router.use('/task',taskRoutes);
router.use('/comment', commentRouter);
router.use('/favorite', favoriteListRouter);
router.use('/dashboard',dashboardRoutes);

export default router;
