import { RequestHandler } from "express";
import { ZodType } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate =(schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join(", ");
      return next(new ApiError(400, message));
    }

    req.body = result.data;
    next();
  };