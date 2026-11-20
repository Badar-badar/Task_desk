import { Router } from "express";
import * as controller from "../controllers/comment.controller";
import { authenticate } from "../middlewares/auth";
import { taskAccess } from "../middlewares/taskAccess";
import { commentAccess } from "../middlewares/commentAccess";
import { validate } from "../middlewares/validate";
import { ALL_ROLES } from "../models/enums";
import {
  commentBodySchema,
  commentIdParamsSchema,
  taskCommentsParamsSchema,
} from "../validators/comment.validator";

// /task/:taskId/comments
export const taskCommentRouter = Router({ mergeParams: true });
taskCommentRouter.use(authenticate);

taskCommentRouter.get(
  "/",
  validate({ params: taskCommentsParamsSchema }),
  taskAccess({ allowedRoles: ALL_ROLES }),
  controller.list,
);

taskCommentRouter.post(
  "/",
  validate({ params: taskCommentsParamsSchema, body: commentBodySchema }),
  taskAccess({ allowedRoles: ["admin", "editor", "commenter"] }),
  controller.create,
);

// /comment/:commentId
export const commentRouter = Router();
commentRouter.use(authenticate);

commentRouter.patch(
  "/:commentId",
  validate({ params: commentIdParamsSchema, body: commentBodySchema }),
  commentAccess({ allowAuthor: true }), // author only
  controller.update,
);

commentRouter.delete(
  "/:commentId",
  validate({ params: commentIdParamsSchema }),
  commentAccess({ allowedRoles: ["admin"], allowAuthor: true }), // author or project admin
  controller.remove,
);