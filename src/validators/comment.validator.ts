import { z } from "zod";

const uuid = (label: string) => z.uuid({ error: `Invalid ${label}` });

export const taskCommentsParamsSchema = z.object({
  taskId: uuid("task ID"),
});

export const commentIdParamsSchema = z.object({
  commentId: uuid("comment ID"),
});

export const commentBodySchema = z
  .object({
    body: z.string({ error: "Comment is required" }).trim().min(1, "Comment cannot be empty").max(2000),
  })
  .strict();
