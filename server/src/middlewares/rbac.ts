import { NextFunction, Request, Response } from 'express';
import { OrgRole } from '../models/enums';
import { ApiError } from '../utils/ApiError';

export const requireRole =
  (...roles: OrgRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to do this');
    }
    next();
  };