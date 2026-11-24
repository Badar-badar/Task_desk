import { z } from "zod";
import { MEMBER_ROLES } from "../models/enums";

const uuid = (label: string) => z.uuid({ error: `Invalid ${label}` });

export const projectMembersParamsSchema = z.object({
  projectId: uuid("project ID"),
});

export const memberParamsSchema = z.object({
  projectId: uuid("project ID"),
  userId: uuid("user ID"),
});

export const addMemberSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
    role: z.enum(MEMBER_ROLES).default("viewer"),
  })
  .strict();

export const updateMemberSchema = z
  .object({
    role: z.enum(MEMBER_ROLES),
  })
  .strict();
