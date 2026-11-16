import { NextFunction, Request, Response } from "express";
import { OrganizationModel } from "../models/organization.model";
import { ApiError } from "../utils/ApiError";

export const orgContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user?.organizationId) {
    throw new ApiError(403, "Create or join an organization first");
  }

  const organization = await OrganizationModel.findOne({
    _id: req.user.organizationId,
    deletedAt: null,
  });

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  req.organization = organization;
  next();
};