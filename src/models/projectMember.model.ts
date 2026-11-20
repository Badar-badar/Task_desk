import mongoose from "mongoose";
import { MEMBER_ROLES } from "./enums";
import type { IProjectMember } from "../interfaces/iProjectMember";

const projectMemberSchema = new mongoose.Schema<IProjectMember.Model>(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: MEMBER_ROLES,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// one membership per user per project
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ userId: 1 });

export const ProjectMemberModel = mongoose.model<IProjectMember.Model>(
  "ProjectMember",
  projectMemberSchema,
);