import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { WorkspaceMemberModel } from "../models/workspaceMember.model";
import { WorkspaceModel } from "../models/workspace.model";
import { ProjectModel } from "../models/project.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import type { WorkspaceRole } from "../models/enums";
import { AppError } from "../utils/appError";

const check = async (
  workspaceId: string | undefined,
  req: Request,
  allowedRoles: WorkspaceRole[],
  allowProjectMembership = false,
) => {
  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid or missing workspace id");
  }

  const [workspace, membership] = await Promise.all([
    WorkspaceModel.exists({ _id: workspaceId, deletedAt: null }),
    WorkspaceMemberModel.findOne({ workspaceId, userId: req.user!._id }).lean(),
  ]);

  if (!workspace) {
    throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
  }

  let projectScoped = false;
  if (!membership && allowProjectMembership) {
    const projectMemberships = await ProjectMemberModel.find({ userId: req.user!._id }).select("projectId").lean();
    projectScoped = projectMemberships.length > 0 && Boolean(await ProjectModel.exists({
      _id: { $in: projectMemberships.map((membership) => membership.projectId) },
      workspaceId,
    }));
  }
  if (!membership && !projectScoped) {
    throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
  }
  if (allowedRoles.length && (!membership || !allowedRoles.includes(membership.role))) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
  }

  req.workspaceId = new mongoose.Types.ObjectId(workspaceId);
  req.workspaceRole = membership?.role;
  req.workspaceProjectScoped = projectScoped;
};

// workspace id comes from the x-workspace-id header (project routes)
export const workspaceContext =
  (allowedRoles: WorkspaceRole[] = []) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await check(req.header("x-workspace-id"), req, allowedRoles, true);
      next();
    } catch (err) {
      next(err);
    }
  };

// Require a real workspace membership for workspace-wide actions such as creating projects.
export const workspaceMemberOnly = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const membership = await WorkspaceMemberModel.findOne({ workspaceId: req.workspaceId, userId: req.user!._id }).lean();
    if (!membership) throw new AppError(403, "FORBIDDEN", "Workspace membership is required for this action");
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