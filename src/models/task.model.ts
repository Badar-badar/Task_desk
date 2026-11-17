
import { Schema, model } from "mongoose";
import { ITask } from "../interfaces/iTask";
import { TASK_PRIORITIES, TASK_STATUSES } from "./enums";

const taskAttachmentSchema = new Schema<ITask.Attachment>(
  {
    key: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  { _id: true },
);

const taskSchema = new Schema<ITask.Model>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "todo",
    },

    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
    },

    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    attachments: {
      type: [taskAttachmentSchema],
      default: [],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
    
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ organizationId: 1, projectId: 1 });
taskSchema.index({ organizationId: 1, assigneeId: 1 });

export const Task = model<ITask.Model>("Task", taskSchema);
