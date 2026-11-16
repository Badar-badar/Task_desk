import { Router } from "express";
import * as taskController from "../controllers/task.controller";
import { authenticate } from "../middlewares/auth";
import { orgContext } from "../middlewares/orgContext";
import { requireRole } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { createTaskSchema, taskIdSchema, updateTaskSchema, projectTasksSchema } from "../validators/task.validator";

const taskRouter = Router();

taskRouter.use(authenticate, orgContext);

taskRouter.get("/project/:projectId", validate({ params: projectTasksSchema }), taskController.listTasks);
taskRouter.post("/project/:projectId",requireRole("owner", "admin"),validate({ body: createTaskSchema, params: projectTasksSchema }),taskController.createTask);
taskRouter.get("/:taskId", validate({ params: taskIdSchema }), taskController.getTask);
taskRouter.patch("/:taskId",requireRole("owner", "admin"),validate({ body: updateTaskSchema, params: taskIdSchema }),taskController.updateTask);
taskRouter.delete("/:taskId", requireRole("owner", "admin"), validate({ params: taskIdSchema }), taskController.deleteTask);

export default taskRouter;