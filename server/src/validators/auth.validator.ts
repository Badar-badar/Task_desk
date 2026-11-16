import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../utils/appError";

export const syncSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100, "Name must be 100 characters or less").optional(),
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

const authValidator = {
  sync: validateBody(syncSchema),
};

export default authValidator;
