import { z } from "zod";

export const favouriteParamsSchema = z.object({
  projectId: z.uuid({ error: "Invalid project ID" }),
});
