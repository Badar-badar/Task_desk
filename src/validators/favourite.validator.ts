import mongoose from "mongoose";
import { z } from "zod";

export const favouriteParamsSchema = z.object({
  projectId: z.string().refine(mongoose.isValidObjectId, {
    message: "Invalid project ID",
  }),
});