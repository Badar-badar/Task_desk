import {Router} from "express"
import mongoose from 'mongoose'
import authRoutes from './auth.routes'
import workspaceRoutes from './workspace.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes'
import dashboardRoutes from './dashboard.routes'
import { commentRouter } from './comment.routes'
import { favoriteListRouter } from './favourite.routes'
import workspaceMemberRouter from './workspaceMember.routes'
const router = Router();

router.get("/health",(_req,res)=>{
    res.json({
        status: 'ok',
        app: 'Task Desk',
        db:mongoose.connection.readyState === 1 ? 'connected': 'disconnected',
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
