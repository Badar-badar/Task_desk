import mongoose from "mongoose";
import { z } from "zod";

export const workspaceMemberParamsSchema = z.object({
  workspaceId: z.string().refine(mongoose.isValidObjectId, { message: "Invalid workspace ID" }),
  userId: z.string().refine(mongoose.isValidObjectId, { message: "Invalid user ID" }),
});

export const addWorkspaceMemberSchema = z
  .object({ email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")) })
  .strict();