
import mongoose from "mongoose";
import type { IWorkspace } from "../interfaces/iWorkspace";

const workspaceSchema = new mongoose.Schema<IWorkspace.PersistenceModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
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
  },
);

workspaceSchema.index({ ownerId: 1 });

export const WorkspaceModel = mongoose.model<IWorkspace.PersistenceModel>(
  "Workspace",
  workspaceSchema,
  "workspaces",
);
