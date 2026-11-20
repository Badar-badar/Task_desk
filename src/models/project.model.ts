
import mongoose from "mongoose";
import type { IProject } from "../interfaces/iProject";
import { PROJECT_STATUSES, PROJECT_COLORS } from "./enums";

const projectSchema = new mongoose.Schema<IProject.Model>(
  {
   
    workspaceId:{
         type:mongoose.Schema.Types.ObjectId,
         ref:'Workspace',
         required:true
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

     color: {
      type: String,
      enum: PROJECT_COLORS,
      default: () =>
        PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },


  },
  {
    timestamps: true,
  },
);

projectSchema.index({ workspaceId: 1 });

export const ProjectModel = mongoose.model<IProject.Model>(
  "Project",
  projectSchema,
);
