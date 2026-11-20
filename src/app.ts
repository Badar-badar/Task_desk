import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index"
import {errorHandler} from './middlewares/errorHandler'
const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  allowedHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
}));
app.use(express.json());
app.use('/api/v1', routes);
app.use(errorHandler)
export default app;
