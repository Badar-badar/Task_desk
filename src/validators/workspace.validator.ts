import { z } from "zod";

export const workspaceIdSchema = z.object({
  workspaceId: z.uuid({ error: "Invalid workspace ID" }),
});

export const createWorkspaceSchema = z
  .object({ name: z.string({ error: "Name is required" }).trim().min(2).max(120) })
  .strict();

export const updateWorkspaceSchema = z
  .object({ name: z.string().trim().min(2).max(120).optional() })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });
