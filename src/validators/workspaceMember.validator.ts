import { z } from "zod";

export const workspaceMemberParamsSchema = z.object({
  workspaceId: z.uuid({ error: "Invalid workspace ID" }),
  userId: z.uuid({ error: "Invalid user ID" }),
});

export const addWorkspaceMemberSchema = z
  .object({ email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")) })
  .strict();
