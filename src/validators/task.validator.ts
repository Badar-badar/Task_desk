import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";
import { TASK_PRIORITIES, TASK_STATUSES } from "../models/enums";

const assigneeIdSchema = z.preprocess(
  (value) => value === "" || value === "null" ? null : value,
  z.union([z.uuid(), z.null()]),
);

const taskBodySchema = z.object({
  title: z.string({ error: "Title is required" }).trim().min(2, "Title must be at least 2 characters").max(120, "Title cannot exceed 120 characters"),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: assigneeIdSchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  completedAt: z.unknown().optional(),
}).strict();

export const createTaskSchema = taskBodySchema.transform(({ completedAt: _completedAt, ...data }) => data);

export const updateTaskSchema = taskBodySchema.partial().transform(({ completedAt: _completedAt, ...data }) => data)
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const projectTasksSchema = z.object({
  projectId: z.uuid({ error: "Invalid project ID" }),
});

export const taskIdSchema = z.object({
  taskId: z.uuid({ error: "Invalid task ID" }),
});

export const taskProjectLinkBodySchema = z.object({
  projectId: z.uuid({ error: "Invalid project ID" }),
}).strict();

export const taskProjectParamsSchema = z.object({
  taskId: z.uuid({ error: "Invalid task ID" }),
  projectId: z.uuid({ error: "Invalid project ID" }),
});

export const taskAttachmentIdSchema = z.object({
  taskId: z.uuid({ error: "Invalid task ID" }),
  attachmentId: z.uuid({ error: "Invalid attachment ID" }),
});

export const taskListQuerySchema = z.object({
  projectId: z.uuid({ error: "Invalid project ID" }).optional(),
  assigneeId: z.union([
    z.literal("me"),
    z.uuid({ error: "Invalid assignee ID" }),
  ]).optional(),
  status: z.enum(TASK_STATUSES).optional(),
}).strict();

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
