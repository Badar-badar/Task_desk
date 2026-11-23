import mongoose from "mongoose";
import { z } from "zod";
import { MEMBER_ROLES } from "../models/enums";

const objectId = (label: string) =>
  z.string().refine(mongoose.isValidObjectId, { message: `Invalid ${label}` });

export const projectMembersParamsSchema = z.object({
  projectId: objectId("project ID"),
});

export const memberParamsSchema = z.object({
  projectId: objectId("project ID"),
  userId: objectId("user ID"),
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