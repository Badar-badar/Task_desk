import { z } from "zod";

export const syncSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be 100 characters or less")
    .optional(),
});

export type SyncBody = z.infer<typeof syncSchema>;