import { prisma } from "../config/db";
import { taskRepository } from "./task.repository";
import { AppError } from "../utils/appError";

class WorkspaceMemberRepository {
  public async listMembers(workspaceId: string) {
    const rows = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      avatarUrl: r.user.avatarUrl,
      role: r.role,
      joinedAt: r.createdAt,
    }));
  }

  // role is always "member"
  public async addMember(workspaceId: string, email: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User must sign up before joining a workspace");
    }

    const exists = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (exists) throw new AppError(409, "ALREADY_MEMBER", "This user is already in the workspace");

    await prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role: "member" },
    });
    return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: "member" };
  }

  public async removeMember(workspaceId: string, userId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    if (member.role === "owner") {
      throw new AppError(400, "OWNER_CANNOT_LEAVE", "The workspace owner cannot be removed");
    }

    // clean up everything this user had inside the workspace
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    await prisma.projectMember.deleteMany({ where: { userId, projectId: { in: projectIds } } });
    await prisma.favorite.deleteMany({ where: { userId, projectId: { in: projectIds } } });
    for (const projectId of projectIds) {
      await taskRepository.unassignUserFromProject(projectId, userId);
    }

    await prisma.workspaceMember.delete({ where: { id: member.id } });
  }
}

export const workspaceMemberRepository = new WorkspaceMemberRepository();