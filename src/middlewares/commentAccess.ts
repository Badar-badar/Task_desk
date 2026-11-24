import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import type { MemberRole } from "../models/enums";
import { AppError } from "../utils/appError";

interface CommentAccessOptions {
  /** roles allowed to act on any comment (e.g. ["admin"] for delete) */
  allowedRoles?: MemberRole[];
  /** the comment's author is always allowed */
  allowAuthor?: boolean;
}

export const commentAccess =
  ({ allowedRoles = [], allowAuthor = true }: CommentAccessOptions = {}) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const rawCommentId = req.params.commentId;
      const commentId = Array.isArray(rawCommentId) ? rawCommentId[0] : rawCommentId;
      if (!commentId) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");

      const comment = await prisma.comment.findFirst({
        where: { id: commentId, deletedAt: null },
      });
      if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");

      const task = await prisma.task.findUnique({
        where: { id: comment.taskId },
        select: { projectId: true, projects: { select: { id: true } } },
      });
      if (!task) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");

      const projectIds = [task.projectId, ...task.projects.map((p) => p.id)];
      const memberships = await prisma.projectMember.findMany({
        where: { projectId: { in: projectIds }, userId: req.user!.id },
      });
      const roleRank: Record<string, number> = { admin: 4, editor: 3, commenter: 2, viewer: 1 };
      const membership = memberships.sort(
        (a, b) => (roleRank[b.role] ?? 0) - (roleRank[a.role] ?? 0),
      )[0];
      if (!membership) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");

      const isAuthor = comment.authorId === req.user!.id;
      const hasRole = allowedRoles.includes(membership.role);

      if (!(allowAuthor && isAuthor) && !hasRole) {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
      }

      // an author who was demoted to viewer can no longer edit
      if (membership.role === "viewer") {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
      }

      req.comment = comment;
      req.projectRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };