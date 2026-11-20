import mongoose from "mongoose";
import type { IWorkspaceMember } from "../interfaces/iWorkspaceMember";
import { WORKSPACE_ROLES } from "./enums";

const workspaceMemberSchema = new mongoose.Schema<IWorkspaceMember.Model>(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      required: true,
      default: "member",
    },
  },
  {
    timestamps: true,
  },
);

// one membership per user per workspace
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

// fast lookup of "all workspaces for this user"
workspaceMemberSchema.index({ userId: 1 });

export const WorkspaceMemberModel = mongoose.model<IWorkspaceMember.Model>(
  "WorkspaceMember",
  workspaceMemberSchema,
);
