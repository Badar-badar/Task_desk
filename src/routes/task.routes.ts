import { Router } from "express";
import * as taskController from "../controllers/task.controller";
import { authenticate } from "../middlewares/auth";
import { projectAccess } from "../middlewares/projectAccess";
import { taskAccess } from "../middlewares/taskAccess";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate";
import { ALL_ROLES } from "../models/enums";
import { taskCommentRouter } from "./comment.routes";
import { workspaceContext } from "../middlewares/workspaceAccess";
import {
  createTaskSchema,
  projectTasksSchema,
  taskAttachmentIdSchema,
  taskIdSchema,
  taskListQuerySchema,
  taskProjectLinkBodySchema,
  taskProjectParamsSchema,
  updateTaskSchema,
} from "../validators/task.validator";

const taskRouter = Router();

taskRouter.use(authenticate, workspaceContext());
taskRouter.use("/:taskId/comments", taskCommentRouter);

// Tasks across all projects the user belongs to in the selected workspace.
taskRouter.get(
  "/",
  validate({ query: taskListQuerySchema }),
  taskController.listMyTasks,
);

taskRouter.get(
  "/project/:projectId",
  validate({ params: projectTasksSchema }),
  projectAccess(ALL_ROLES),
  taskController.listTasks,
);

taskRouter.post(
  "/project/:projectId",
  validate({ params: projectTasksSchema }),
  projectAccess(["admin", "editor"]),
  upload.array("files", 5),
  validate({ body: createTaskSchema }),
  taskController.createTask,
);

taskRouter.post(
  "/:taskId/attachments",
  validate({ params: taskIdSchema }),
  taskAccess({ allowedRoles: ["admin", "editor"], allowAssignee: true }),
  upload.array("files", 5),
  taskController.addTaskAttachments,
);

taskRouter.delete(
  "/:taskId/attachments/:attachmentId",
  validate({ params: taskAttachmentIdSchema }),
  taskAccess({ allowedRoles: ["admin", "editor"], allowAssignee: true }),
  taskController.deleteTaskAttachment,
);

taskRouter.post(
  "/:taskId/projects",
  validate({ params: taskIdSchema, body: taskProjectLinkBodySchema }),
  taskAccess({ allowedRoles: ["admin", "editor"] }),
  taskController.addTaskProject,
);

taskRouter.delete(
  "/:taskId/projects/:projectId",
  validate({ params: taskProjectParamsSchema }),
  taskAccess({ allowedRoles: ["admin", "editor"] }),
  taskController.removeTaskProject,
);

taskRouter.get(
  "/:taskId",
  validate({ params: taskIdSchema }),
  taskAccess({ allowedRoles: ALL_ROLES }),
  taskController.getTask,
);

taskRouter.patch(
  "/:taskId",
  validate({ params: taskIdSchema }),
  taskAccess({ allowedRoles: ["admin", "editor"], allowAssignee: true }),
  upload.array("files", 5),
  taskController.enforceAssigneeStatusOnly,
  validate({ body: updateTaskSchema }),
  taskController.updateTask,
);

taskRouter.delete(
  "/:taskId",
  validate({ params: taskIdSchema }),
  taskAccess({ allowedRoles: ["admin", "editor"] }),
  taskController.deleteTask,
);

export default taskRouter;

