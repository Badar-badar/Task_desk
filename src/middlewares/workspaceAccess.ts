import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { WorkspaceMemberModel } from "../models/workspaceMember.model";
import { WorkspaceModel } from "../models/workspace.model";
import type { WorkspaceRole } from "../models/enums";
import { AppError } from "../utils/appError";

const check = async (
  workspaceId: string | undefined,
  req: Request,
  allowedRoles: WorkspaceRole[],
) => {
  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid or missing workspace id");
  }

  const [workspace, membership] = await Promise.all([
    WorkspaceModel.exists({ _id: workspaceId, deletedAt: null }),
    WorkspaceMemberModel.findOne({ workspaceId, userId: req.user!._id }).lean(),
  ]);

  if (!workspace || !membership) {
    throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
  }
  if (allowedRoles.length && !allowedRoles.includes(membership.role)) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
  }

  req.workspaceId = new mongoose.Types.ObjectId(workspaceId);
  req.workspaceRole = membership.role;
};

// workspace id comes from the x-workspace-id header (project routes)
export const workspaceContext =
  (allowedRoles: WorkspaceRole[] = []) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await check(req.header("x-workspace-id"), req, allowedRoles);
      next();
    } catch (err) {
      next(err);
    }
  };

// workspace id comes from the URL (/workspace/:workspaceId/...)
export const workspaceAccess =
  (allowedRoles: WorkspaceRole[] = []) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await check(req.params.workspaceId as string, req, allowedRoles);
      next();
    } catch (err) {
      next(err);
    }
  };