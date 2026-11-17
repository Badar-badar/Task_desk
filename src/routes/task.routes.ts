import { Router } from "express";
import * as taskController from "../controllers/task.controller";
import { authenticate } from "../middlewares/auth";
import { orgContext } from "../middlewares/orgContext";
import { requireRole } from "../middlewares/rbac";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate";
import {
  createTaskSchema,
  projectTasksSchema,
  taskAttachmentIdSchema,
  taskIdSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "../validators/task.validator";

const taskRouter = Router();

taskRouter.use(authenticate, orgContext);

taskRouter.get("/", validate({ query: taskListQuerySchema }), taskController.listOrganizationTasks);
taskRouter.get("/project/:projectId", validate({ params: projectTasksSchema }), taskController.listTasks);
taskRouter.post(
  "/project/:projectId",
  requireRole("owner", "admin"),
  validate({ params: projectTasksSchema }),
  upload.array("files", 5),
  validate({ body: createTaskSchema }),
  taskController.createTask,
);
taskRouter.post(
  "/:taskId/attachments",
  validate({ params: taskIdSchema }),
  taskController.authorizeTaskAccess,
  upload.array("files", 5),
  taskController.addTaskAttachments,
);
taskRouter.delete(
  "/:taskId/attachments/:attachmentId",
  validate({ params: taskAttachmentIdSchema }),
  taskController.deleteTaskAttachment,
);
taskRouter.get("/:taskId", validate({ params: taskIdSchema }), taskController.getTask);
taskRouter.patch(
  "/:taskId",
  validate({ params: taskIdSchema }),
  taskController.authorizeTaskAccess,
  upload.array("files", 5),
  taskController.enforceEmployeeStatusOnly,
  validate({ body: updateTaskSchema }),
  taskController.updateTask,
);
taskRouter.delete("/:taskId", requireRole("owner", "admin"), validate({ params: taskIdSchema }), taskController.deleteTask);

export default taskRouter;