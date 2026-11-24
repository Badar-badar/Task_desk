import { z } from "zod";
import { MEMBER_ROLES } from "../models/enums";

const uuid = (label: string) => z.uuid({ error: `Invalid ${label}` });

export const projectInvitationsParamsSchema = z.object({
  projectId: uuid("project ID"),
});

export const invitationParamsSchema = z.object({
  projectId: uuid("project ID"),
  invitationId: uuid("invitation ID"),
});

export const updateInvitationSchema = z
  .object({
    role: z.enum(MEMBER_ROLES),
  })
  .strict();
