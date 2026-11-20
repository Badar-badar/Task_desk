import mongoose from "mongoose";
import type { IInvitation } from "../interfaces/iInvitation";
import { MEMBER_ROLES, INVITATION_STATUSES } from "./enums";

const invitationSchema = new mongoose.Schema<IInvitation.Model>(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: MEMBER_ROLES,
      required: true,
      default: "editor",
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    acceptedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);


invitationSchema.index({ email: 1, status: 1 });

invitationSchema.index({ projectId: 1, status: 1 });

export const InvitationModel = mongoose.model<IInvitation.Model>(
  "Invitation",
  invitationSchema,
);