import type { Types } from "mongoose";
import type { MemberRole } from "../models/enums";
import { ProjectMemberModel } from "../models/projectMember.model";
import { InvitationModel } from "../models/invitation.model";
import { FavoriteModel } from "../models/favourite";
import { User } from "../models/user.model";
import { ProjectModel } from "../models/project.model";
import { taskRepository } from "./task.repository";
import { AppError } from "../utils/appError";

const serialize = (row: any) => ({
  _id: row.userId._id,
  name: row.userId.name,
  email: row.userId.email,
  avatarUrl: row.userId.avatarUrl,
  role: row.role,
  joinedAt: row.createdAt,
});

class ProjectMemberRepository {
  public async listMembers(projectId: Types.ObjectId) {
    const rows = await ProjectMemberModel.find({ projectId })
      .populate("userId", "name email avatarUrl")
      .sort({ createdAt: 1 })
      .lean();

    return rows.filter((row: any) => row.userId).map(serialize);
  }

  // existing user -> member now, unknown email -> pending invitation
  public async addMember(
    projectId: Types.ObjectId,
    invitedBy: Types.ObjectId,
    email: string,
    role: MemberRole,
  ) {
    const user = await User.findOne({ email, isActive: true }).select("_id name email avatarUrl");

    if (user) {
      const exists = await ProjectMemberModel.exists({ projectId, userId: user._id });
      if (exists) {
        throw new AppError(409, "ALREADY_MEMBER", "This user is already a member of the project");
      }

      await ProjectMemberModel.create({ projectId, userId: user._id, role });
      return {
        invited: false as const,
        member: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role,
        },
      };
    }

    // one pending invitation per project + email: update the role if it exists
    const invitation = await InvitationModel.findOneAndUpdate(
      { projectId, email, status: "pending" },
      { $set: { role, invitedBy } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );

    const [project, inviter] = await Promise.all([
      ProjectModel.findById(projectId).select("name").lean(),
      User.findById(invitedBy).select("name").lean(),
    ]);

    if (!project || !inviter) {
      throw new AppError(404, "INVITATION_CONTEXT_NOT_FOUND", "Could not load project invitation details");
    }

    return {
      invited: true as const,
      invitation,
      projectName: project.name,
      inviterName: inviter.name,
    };
  }

  public async updateRole(projectId: Types.ObjectId, userId: string, role: MemberRole) {
    const member = await ProjectMemberModel.findOne({ projectId, userId });
    if (!member) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");

    if (member.role === "admin" && role !== "admin") {
      await this.assertNotLastAdmin(projectId);
    }

    member.role = role;
    await member.save();

    const populated = await member.populate("userId", "name email avatarUrl");
    return serialize(populated);
  }

  public async removeMember(projectId: Types.ObjectId, userId: string) {
    const member = await ProjectMemberModel.findOne({ projectId, userId });
    if (!member) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");

    if (member.role === "admin") {
      await this.assertNotLastAdmin(projectId);
    }

    await ProjectMemberModel.deleteOne({ _id: member._id });
    await Promise.all([
      FavoriteModel.deleteMany({ projectId, userId }),
      taskRepository.unassignUserFromProject(projectId, member.userId),
    ]);
  }

  private async assertNotLastAdmin(projectId: Types.ObjectId) {
    const admins = await ProjectMemberModel.countDocuments({ projectId, role: "admin" });
    if (admins <= 1) {
      throw new AppError(
        400,
        "LAST_ADMIN",
        "A project must have at least one admin. Make someone else admin first",
      );
    }
  }
}

export const projectMemberRepository = new ProjectMemberRepository();
