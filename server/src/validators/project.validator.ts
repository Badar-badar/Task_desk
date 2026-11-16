import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { PROJECT_STATUSES } from "../models/enums";

export const createProjectSchema = z.object({
  name: z.string({ error: "Name is required" }).trim().min(2, "Name must be at least 2 characters").max(150),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
}).strict();

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update",
});

export const projectIdSchema = z.object({
  projectId: z.string().refine(mongoose.isValidObjectId, {
    message: "Invalid projectId",
  }),
});

const validateBody = (schema: z.ZodType): RequestHandler => {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", result.error.message));
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
      next(new AppError(400, "VALIDATION_ERROR", result.error.message));
      return;
    }

    next();
  };
};

const projectValidator = {
  create: validateBody(createProjectSchema),
  update: validateBody(updateProjectSchema),
  projectIdParams: validateParams(projectIdSchema),
};

export default projectValidator;