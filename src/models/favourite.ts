import mongoose from "mongoose";
import type { IFavorite } from "../interfaces/iFavourite";

const favoriteSchema = new mongoose.Schema<IFavorite.Model>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export const FavoriteModel = mongoose.model<IFavorite.Model>(
  "Favorite",
  favoriteSchema,
);