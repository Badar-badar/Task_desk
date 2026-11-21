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

      const task = await TaskModel.findOne({ _id: taskId, workspaceId: req.workspaceId, deletedAt: null });
      if (!task) throw new AppError(404, "API_ERROR", "Task not found");

      const projectIds = [task.projectId, ...(task.projectIds ?? [])];
      const memberships = await ProjectMemberModel.find({
        projectId: { $in: projectIds },
        userId: req.user!._id,
      }).lean();
      const roleRank: Record<string, number> = { admin: 4, editor: 3, commenter: 2, viewer: 1 };
      const membership = memberships.sort((a, b) => (roleRank[b.role] ?? 0) - (roleRank[a.role] ?? 0))[0];
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
      req.projectId = membership.projectId;
      req.projectRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
