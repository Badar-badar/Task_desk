import mongoose from "mongoose";
import { z } from "zod";

const objectId = (label: string) =>
  z.string().refine(mongoose.isValidObjectId, { message: `Invalid ${label}` });

export const taskCommentsParamsSchema = z.object({
  taskId: objectId("task ID"),
});

export const commentIdParamsSchema = z.object({
  commentId: objectId("comment ID"),
});

export const commentBodySchema = z
  .object({
    body: z.string({ error: "Comment is required" }).trim().min(1, "Comment cannot be empty").max(2000),
  })
  .strict();