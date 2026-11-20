import type { Types } from "mongoose";
import { CommentModel } from "../models/comment.model";
import { AppError } from "../utils/appError";

class CommentRepository {
  public async listByTask(taskId: Types.ObjectId) {
    return CommentModel.find({ taskId, deletedAt: null })
      .populate("authorId", "name avatarUrl")
      .sort({ createdAt: 1 })
      .lean();
  }

  public async create(data: {
    taskId: Types.ObjectId;
    projectId: Types.ObjectId;
    authorId: Types.ObjectId;
    body: string;
  }) {
    const comment = await CommentModel.create(data);
    return comment.populate("authorId", "name avatarUrl");
  }

  public async getComment(commentId: string) {
    const comment = await CommentModel.findOne({ _id: commentId, deletedAt: null });
    if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
    return comment;
  }

  public async updateBody(comment: InstanceType<typeof CommentModel>, body: string) {
    comment.body = body;
    await comment.save();
    return comment.populate("authorId", "name avatarUrl");
  }

  public async softDelete(commentId: Types.ObjectId) {
    await CommentModel.updateOne({ _id: commentId }, { $set: { deletedAt: new Date() } });
  }

  // called when a task is deleted
  public async softDeleteByTask(taskId: Types.ObjectId | string) {
    await CommentModel.updateMany(
      { taskId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
  }
}

export const commentRepository = new CommentRepository();