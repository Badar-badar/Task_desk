import type { Types } from "mongoose";
import { WorkspaceMemberModel } from "../models/workspaceMember.model";
import { ProjectModel } from "../models/project.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import { FavoriteModel } from "../models/favourite";
import { User } from "../models/user.model";
import { taskRepository } from "./task.repository";
import { AppError } from "../utils/appError";

class WorkspaceMemberRepository {
  public async listMembers(workspaceId: Types.ObjectId) {
    const rows = await WorkspaceMemberModel.find({ workspaceId })
      .populate("userId", "name email avatarUrl")
      .sort({ createdAt: 1 })
      .lean();

    return rows
      .filter((r: any) => r.userId)
      .map((r: any) => ({
        _id: r.userId._id,
        name: r.userId.name,
        email: r.userId.email,
        avatarUrl: r.userId.avatarUrl,
        role: r.role,
        joinedAt: r.createdAt,
      }));
  }

  // role is always "member"
  public async addMember(workspaceId: Types.ObjectId, email: string) {
    const user = await User.findOne({ email, isActive: true }).select("_id name email avatarUrl");
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User must sign up before joining a workspace");
    }

    const exists = await WorkspaceMemberModel.exists({ workspaceId, userId: user._id });
    if (exists) throw new AppError(409, "ALREADY_MEMBER", "This user is already in the workspace");

    await WorkspaceMemberModel.create({ workspaceId, userId: user._id, role: "member" });
    return { _id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: "member" };
  }

  public async removeMember(workspaceId: Types.ObjectId, userId: string) {
    const member = await WorkspaceMemberModel.findOne({ workspaceId, userId });
    if (!member) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    if (member.role === "owner") {
      throw new AppError(400, "OWNER_CANNOT_LEAVE", "The workspace owner cannot be removed");
    }

    // clean up everything this user had inside the workspace
    const projects = await ProjectModel.find({ workspaceId }).select("_id").lean();
    for (const project of projects) {
      await ProjectMemberModel.deleteOne({ projectId: project._id, userId });
      await FavoriteModel.deleteOne({ projectId: project._id, userId });
      await taskRepository.unassignUserFromProject(project._id, member.userId);
    }

    await WorkspaceMemberModel.deleteOne({ _id: member._id });
  }
}

export const workspaceMemberRepository = new WorkspaceMemberRepository();
