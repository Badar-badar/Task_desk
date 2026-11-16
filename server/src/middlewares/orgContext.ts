import { NextFunction, Request, Response } from "express";
import { OrganizationModel } from "../models/organization.model";
import { AppError } from "../utils/appError";

export const orgContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user?.organizationId) {
    throw new AppError(403, "API_ERROR", "Create or join an organization first");
  }

  const organization = await OrganizationModel.findOne({
    _id: req.user.organizationId,
    deletedAt: null,
  });

  if (!organization) {
    throw new AppError(404, "API_ERROR", "Organization not found");
  }

  req.organization = organization;
  next();
};