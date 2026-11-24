import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
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
      const rawTaskId = req.params.taskId;
      const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;

      if (!taskId) {
        throw new AppError(400, "API_ERROR", "Invalid task id");
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId: req.workspaceId, deletedAt: null },
        include: { projects: { select: { id: true } } },
      });
      if (!task) throw new AppError(404, "API_ERROR", "Task not found");

      const projectIds = [task.projectId, ...task.projects.map((p) => p.id)];
      const memberships = await prisma.projectMember.findMany({
        where: { projectId: { in: projectIds }, userId: req.user!.id },
      });
      const roleRank: Record<string, number> = { admin: 4, editor: 3, commenter: 2, viewer: 1 };
      const membership = memberships.sort(
        (a, b) => (roleRank[b.role] ?? 0) - (roleRank[a.role] ?? 0),
      )[0];
      if (!membership) throw new AppError(404, "API_ERROR", "Task not found");

      const hasRole = allowedRoles.includes(membership.role);
      const isAssignee = allowAssignee && task.assigneeId != null && task.assigneeId === req.user!.id;

      if (!hasRole && !isAssignee) {
        throw new AppError(403, "API_ERROR", "You do not have permission to do this");
      }

      const { projects, ...rest } = task;
      req.task = { ...rest, projectIds: projects.map((p) => p.id) };
      req.projectId = membership.projectId;
      req.projectRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };