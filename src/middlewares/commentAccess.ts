import type { Request, Response, NextFunction } from "express";
import { CommentModel } from "../models/comment.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import { TaskModel } from "../models/task.model";
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
      const comment = await CommentModel.findOne({
        _id: req.params.commentId,
        deletedAt: null,
      });
      if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");

      const task = await TaskModel.findById(comment.taskId).select("projectId projectIds");
      if (!task) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
      const projectIds = [task.projectId, ...(task.projectIds ?? [])];
      const memberships = await ProjectMemberModel.find({ projectId: { $in: projectIds }, userId: req.user!._id }).lean();
      const roleRank: Record<string, number> = { admin: 4, editor: 3, commenter: 2, viewer: 1 };
      const membership = memberships.sort((a, b) => (roleRank[b.role] ?? 0) - (roleRank[a.role] ?? 0))[0];
      if (!membership) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");

      const isAuthor = comment.authorId.equals(req.user!._id);
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