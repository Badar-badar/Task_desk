import { prisma } from "../config/db";
import { taskRepository } from "./task.repository";
import { AppError } from "../utils/appError";
import type { MemberRole } from "../models/enums";

const userSelect = { select: { id: true, name: true, email: true, avatarUrl: true } };

const serialize = (row: {
  role: MemberRole;
  createdAt: Date;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}) => ({
  id: row.user.id,
  name: row.user.name,
  email: row.user.email,
  avatarUrl: row.user.avatarUrl,
  role: row.role,
  joinedAt: row.createdAt,
});

class ProjectMemberRepository {
  public async listMembers(projectId: string) {
    const rows = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: userSelect },
      orderBy: { createdAt: "asc" },
    });

    return rows.map(serialize);
  }

  // existing user -> member now, unknown email -> pending invitation
  public async addMember(projectId: string, invitedBy: string, email: string, role: MemberRole) {
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: cleanEmail, isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    if (user) {
      const exists = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });
      if (exists) {
        throw new AppError(409, "ALREADY_MEMBER", "This user is already a member of the project");
      }

      await prisma.projectMember.create({ data: { projectId, userId: user.id, role } });
      return {
        invited: false as const,
        member: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role,
        },
      };
    }

    // one pending invitation per project + email: update the role if it exists
    const existing = await prisma.invitation.findFirst({
      where: { projectId, email: cleanEmail, status: "pending" },
    });

    const invitation = existing
      ? await prisma.invitation.update({
          where: { id: existing.id },
          data: { role, invitedBy },
        })
      : await prisma.invitation.create({
          data: { projectId, email: cleanEmail, role, invitedBy },
        });

    const [project, inviter] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: invitedBy }, select: { name: true } }),
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

  public async updateRole(projectId: string, userId: string, role: MemberRole) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");

    if (member.role === "admin" && role !== "admin") {
      await this.assertNotLastAdmin(projectId);
    }

    const updated = await prisma.projectMember.update({
      where: { id: member.id },
      data: { role },
      include: { user: userSelect },
    });
    return serialize(updated);
  }

  public async removeMember(projectId: string, userId: string) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");

    if (member.role === "admin") {
      await this.assertNotLastAdmin(projectId);
    }

    await prisma.projectMember.delete({ where: { id: member.id } });
    await Promise.all([
      prisma.favorite.deleteMany({ where: { projectId, userId } }),
      taskRepository.unassignUserFromProject(projectId, member.userId),
    ]);
  }

  private async assertNotLastAdmin(projectId: string) {
    const admins = await prisma.projectMember.count({ where: { projectId, role: "admin" } });
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