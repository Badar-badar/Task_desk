import { Router } from "express";
import * as taskController from "../controllers/task.controller";
import { authenticate } from "../middlewares/auth";
import { orgContext } from "../middlewares/orgContext";
import { requireRole } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { createTaskSchema, taskIdSchema, updateTaskSchema, projectTasksSchema } from "../validators/task.validator";

const taskRouter = Router();

taskRouter.use(authenticate, orgContext);

taskRouter.get("/project/:projectId", validate(projectTasksSchema), taskController.listTasks);
taskRouter.post("/project/:projectId", requireRole("owner", "admin"), validate(createTaskSchema), taskController.createTask);
taskRouter.get("/:taskId", validate(taskIdSchema), taskController.getTask);
taskRouter.patch("/:taskId", requireRole("owner", "admin"), validate(updateTaskSchema), taskController.updateTask);
taskRouter.delete("/:taskId", requireRole("owner", "admin"), validate(taskIdSchema), taskController.deleteTask);

export default taskRouter;