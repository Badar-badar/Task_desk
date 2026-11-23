import crypto from "crypto";
import type { Types } from "mongoose";
import { WorkspaceModel } from "../models/workspace.model";
import { WorkspaceMemberModel } from "../models/workspaceMember.model";
import { ProjectModel } from "../models/project.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import { projectRepository } from "./project.repository";
import { AppError } from "../utils/appError";

const makeSlug = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${crypto.randomBytes(3).toString("hex")}`;

class WorkspaceRepository {
  public async createWorkspace(userId: Types.ObjectId, name: string) {
    const workspace = await WorkspaceModel.create({ name, slug: makeSlug(name), ownerId: userId });

    try {
      await WorkspaceMemberModel.create({ workspaceId: workspace._id, userId, role: "owner" });
    } catch (error) {
      await WorkspaceModel.deleteOne({ _id: workspace._id });
      throw error;
    }
    return { ...workspace.toObject(), role: "owner" as const };
  }

  // for the sidebar switcher
  public async listMine(userId: Types.ObjectId) {
    const rows = await WorkspaceMemberModel.find({ userId })
      .populate({ path: "workspaceId", match: { deletedAt: null } })
      .sort({ createdAt: 1 })
      .lean();

    const workspaces = new Map<string, any>(rows
      .filter((row: any) => row.workspaceId)
      .map((row: any) => [row.workspaceId._id.toString(), { ...row.workspaceId, role: row.role }] as const));

    const projectMemberships = await ProjectMemberModel.find({ userId }).select("projectId").lean();
    if (projectMemberships.length) {
      const projects = await ProjectModel.find({ _id: { $in: projectMemberships.map((membership) => membership.projectId) } })
        .select("workspaceId")
        .lean();
      const workspaceIds = [...new Set(projects.map((project) => project.workspaceId.toString()))];
      const guestWorkspaces = await WorkspaceModel.find({ _id: { $in: workspaceIds }, deletedAt: null }).lean();
      for (const workspace of guestWorkspaces) {
        const id = workspace._id.toString();
        if (!workspaces.has(id)) workspaces.set(id, { ...workspace, role: "project_member" });
      }
    }

    return [...workspaces.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public async getWorkspace(workspaceId: Types.ObjectId, role: string) {
    const workspace = await WorkspaceModel.findOne({ _id: workspaceId, deletedAt: null }).lean();
    if (!workspace) throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
    return { ...workspace, role };
  }

  public async updateWorkspace(workspaceId: Types.ObjectId, data: { name?: string }) {
    const workspace = await WorkspaceModel.findOneAndUpdate(
      { _id: workspaceId, deletedAt: null },
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!workspace) throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
    return workspace;
  }

  // returns tasks so the controller can delete the attachment files
  public async deleteWorkspace(workspaceId: Types.ObjectId) {
    const projects = await ProjectModel.find({ workspaceId }).select("_id");
    const allTasks = [];
    for (const project of projects) {
      const { tasks } = await projectRepository.deleteProject(project._id);
      allTasks.push(...tasks);
    }

    await WorkspaceMemberModel.deleteMany({ workspaceId });
    await WorkspaceModel.updateOne({ _id: workspaceId }, { $set: { deletedAt: new Date() } });
    return { tasks: allTasks };
  }
}

export const workspaceRepository = new WorkspaceRepository();