import {Router} from "express"
import mongoose from 'mongoose'
import authRoutes from './auth.routes'
import organizationRoutes from './organization.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes'
const router = Router();

router.get("/health",(_req,res)=>{
    res.json({
        status: 'ok',
        app: 'Task Desk',
        db:mongoose.connection.readyState === 1 ? 'connected': 'disconnected',
    });
});

router.use('/auth',authRoutes)
router.use('/organization',organizationRoutes); 
router.use('/project',projectRoutes); 
router.use('/task',taskRoutes);

export default router;