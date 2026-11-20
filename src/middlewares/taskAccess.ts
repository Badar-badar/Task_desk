import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { TaskModel } from "../models/task.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import type { MemberRole } from "../models/enums";
import { AppError } from "../utils/appError"; 

interface TaskAccessOptions {
  allowedRoles: MemberRole[];
  /** also let the task's assignee through, whatever their role */
  allowAssignee?: boolean;
}

export const taskAccess =
  ({ allowedRoles, allowAssignee = false }: TaskAccessOptions) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;

      if (!mongoose.isValidObjectId(taskId)) {
        throw new AppError(400, "API_ERROR", "Invalid task id");
      }

      const task = await TaskModel.findOne({ _id: taskId, deletedAt: null });
      if (!task) throw new AppError(404, "API_ERROR", "Task not found");

      const membership = await ProjectMemberModel.findOne({
        projectId: task.projectId,
        userId: req.user!._id,
      }).lean();

      if (!membership) throw new AppError(404, "API_ERROR", "Task not found");

      const hasRole = allowedRoles.includes(membership.role);
      const isAssignee =
        allowAssignee &&
        task.assigneeId != null &&
        task.assigneeId.equals(req.user!._id);

      if (!hasRole && !isAssignee) {
        throw new AppError(403, "API_ERROR", "You do not have permission to do this");
      }

      req.task = task;
      req.projectId = task.projectId;
      req.projectRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
