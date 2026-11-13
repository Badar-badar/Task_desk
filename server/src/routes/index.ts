import {Router} from "express"
import mongoose from 'mongoose'
import authRoutes from './auth.routes'
const router = Router();

router.get("/health",(_req,res)=>{
    res.json({
        status: 'ok',
        app: 'Task Desk',
        db:mongoose.connection.readyState === 1 ? 'connected': 'disconnected',
    });
});

router.use('/auth',authRoutes)

export default router;