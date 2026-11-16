import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { TASK_STATUSES } from "../models/enums";

export const createTaskSchema = z.object({
  title: z.string({ error: "Title is required" }).trim().min(2, "Title must be at least 2 characters").max(120, "Title cannot exceed 120 characters"),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
}).strict();

export const updateTaskSchema = createTaskSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update",
});

export const projectTasksSchema = z.object({
  projectId: z.string().refine(mongoose.isValidObjectId, {
    message: "Invalid project ID",
  }),
});

export const taskIdSchema = z.object({
  taskId: z.string().refine(mongoose.isValidObjectId, {
    message: "Invalid task ID",
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

const taskValidator = {
  create: validateBody(createTaskSchema),
  update: validateBody(updateTaskSchema),
  projectIdParams: validateParams(projectTasksSchema),
  taskIdParams: validateParams(taskIdSchema),
};

export default taskValidator;