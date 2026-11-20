import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ProjectMemberModel } from "../models/projectMember.model";
import type { MemberRole } from "../models/enums";
import { AppError } from "../utils/appError"; 

/**
 * Allows only members whose role is in `allowedRoles`.
 * Example: projectAccess(["admin", "editor"])
 */
export const projectAccess =
  (allowedRoles: MemberRole[], paramName = "projectId") =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const rawProjectId = req.params[paramName];
      const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;

      if (!mongoose.isValidObjectId(projectId)) {
        throw new AppError(400, "API_ERROR", "Invalid project id");
      }

      const membership = await ProjectMemberModel.findOne({
        projectId,
        userId: req.user!._id,
      }).lean();

      if (!membership) throw new AppError(404, "API_ERROR", "Project not found");

      if (!allowedRoles.includes(membership.role)) {
        throw new AppError(403, "API_ERROR", "You do not have permission to do this");
      }

      req.projectId = new mongoose.Types.ObjectId(projectId);
      req.projectRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
