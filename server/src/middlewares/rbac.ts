import { NextFunction, Request, Response } from 'express';
import { OrgRole } from '../models/enums';
import { AppError } from "../utils/appError";

export const requireRole =
  (...roles: OrgRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      throw new AppError(403, "API_ERROR", "You do not have permission to do this");
    }
    next();
  };