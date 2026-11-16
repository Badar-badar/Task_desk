
import mongoose from "mongoose";
import type { IProject } from "../interfaces/iProject";
import { PROJECT_STATUSES } from "./enums";

const projectSchema = new mongoose.Schema<IProject.Model>(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "active",
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ organizationId: 1 });

export const ProjectModel = mongoose.model<IProject.Model>(
  "Project",
  projectSchema,
);
