import { RequestHandler } from "express";
import { ZodType } from "zod";
import { ApiError } from "../utils/ApiError.js";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validate =
  (schemas: Schemas | ZodType): RequestHandler =>
  (req, _res, next) => {
    // Old style: validate(syncSchema) checks req.body directly
    const parts: Schemas = "safeParse" in schemas ? { body: schemas } : schemas;
    const errors: string[] = [];

    for (const key of ["body", "params", "query"] as const) {
      const schema = parts[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          errors.push(`${key}.${issue.path.join(".") || "value"}: ${issue.message}`)
        );
      } else if (key === "body") {
        req.body = result.data;
      }
    }

    if (errors.length) return next(new ApiError(400, errors.join(", ")));
    next();
  };