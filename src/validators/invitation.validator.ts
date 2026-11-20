import mongoose from "mongoose";
import { z } from "zod";
import { MEMBER_ROLES } from "../models/enums";

const objectId = (label: string) =>
  z.string().refine(mongoose.isValidObjectId, { message: `Invalid ${label}` });

export const projectInvitationsParamsSchema = z.object({
  projectId: objectId("project ID"),
});

export const invitationParamsSchema = z.object({
  projectId: objectId("project ID"),
  invitationId: objectId("invitation ID"),
});

export const updateInvitationSchema = z
  .object({
    role: z.enum(MEMBER_ROLES),
  })
  .strict();