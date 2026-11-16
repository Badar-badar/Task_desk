
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { ASSIGNABLE_ROLES } from "../models/enums";

const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
  }).strict();

const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
  }).strict().refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });


const addMemberSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(ASSIGNABLE_ROLES).default("employee"),
  }).strict();

const changeRoleSchema = z
  .object({
    role: z.enum(ASSIGNABLE_ROLES),
  }).strict();

  
const memberIdParamsSchema = z.object({
  userId: z.string().refine(mongoose.isValidObjectId, {
    message: "Invalid userId",
  }),
});

const validateBody = (schema: z.ZodType): RequestHandler => {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          result.error.message,
        ),
      );
      return;
    }

    request.body = result.data;
    next();
  };
};

const validateParams = (schema: z.ZodType): RequestHandler => {
  return (request, _response, next) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          result.error.message,
        ),
      );
      return;
    }

    next();
  };
};

const organizationValidator = {
  create: validateBody(createOrganizationSchema),
  update: validateBody(updateOrganizationSchema),
  addMember: validateBody(addMemberSchema),
  changeRole: validateBody(changeRoleSchema),
  memberIdParams: validateParams(memberIdParamsSchema),
};

export default organizationValidator;
