import mongoose from "mongoose";
import type { IComment } from "../interfaces/iComment";

const commentSchema = new mongoose.Schema<IComment.Model>(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// list comments of a task, oldest first
commentSchema.index({ taskId: 1, deletedAt: 1, createdAt: 1 });

export const CommentModel = mongoose.model<IComment.Model>(
  "Comment",
  commentSchema,
);