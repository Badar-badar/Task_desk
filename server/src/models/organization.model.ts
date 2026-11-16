
import mongoose from "mongoose";
import type { IOrganization } from "../interfaces/iOrganization";

const organizationSchema = new mongoose.Schema<IOrganization.PersistenceModel>(
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

    description: {
      type: String,
      trim: true,
      maxlength: 500,
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

organizationSchema.index({ ownerId: 1 });

export const OrganizationModel = mongoose.model<IOrganization.PersistenceModel>(
  "Organization",
  organizationSchema,
);
