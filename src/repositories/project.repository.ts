import type { IProject } from "../interfaces/iProject";
import { prisma } from "../config/db";
import { taskRepository } from "./task.repository";
import { AppError } from "../utils/appError";
import { favoriteRepository } from "./favourite.repository";
import { PROJECT_COLORS, type MemberRole } from "../models/enums";

type MemberPreview = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: MemberRole;
};

const ownerSelect = { select: { id: true, name: true, email: true, avatarUrl: true } };

class ProjectRepository {
  public async createProject(workspaceId: string, userId: string, data: IProject.CreateObj) {
    const { dueDate, ...rest } = data;

    // Pick a color here because Prisma does not define an application-level default.
    const color = rest.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

    // project + admin member are created together, if one fails both are cancelled
    const project = await prisma.project.create({
      data: {
        ...rest,
        color,
        endDate: dueDate,
        workspaceId,
        ownerId: userId,
        members: { create: { userId, role: "admin" } },
      },
    });

    return { ...project, role: "admin" as MemberRole };
  }

  // projects where the user is a member
  public async listProjects(workspaceId: string, userId: string) {
    const memberships = await prisma.projectMember.findMany({
      where: { userId, project: { workspaceId } },
      select: { projectId: true, role: true },
    });
    if (!memberships.length) return [];

    const roleByProject = new Map(memberships.map((m) => [m.projectId, m.role]));
    const projects = await prisma.project.findMany({
      where: { workspaceId, id: { in: memberships.map((m) => m.projectId) } },
      orderBy: { createdAt: "desc" },
      include: { owner: ownerSelect },
    });

    const withStats = await this.addTaskStats(projects);
    const withMembers = await this.addMembersPreview(withStats);

    const favoriteIds = await favoriteRepository.getFavoriteIds(
      userId,
      projects.map((p) => p.id),
    );
    return withMembers.map((project) => ({
      ...project,
      role: roleByProject.get(project.id)!,
      isFavorite: favoriteIds.has(project.id),
    }));
  }

  public async getProject(projectId: string, role: MemberRole, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: ownerSelect },
    });
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    const [withStats] = await this.addTaskStats([project]);
    const [withMembers] = await this.addMembersPreview([withStats]);
    const favoriteIds = await favoriteRepository.getFavoriteIds(userId, [projectId]);
    return { ...withMembers, role, isFavorite: favoriteIds.has(projectId) };
  }

  public async countProjects(workspaceId: string, userId: string) {
    return prisma.project.count({
      where: { workspaceId, members: { some: { userId } } },
    });
  }

  public async getRecentProjects(workspaceId: string, userId: string, limit: number) {
    const projects = await prisma.project.findMany({
      where: { workspaceId, members: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return this.addTaskStats(projects);
  }

  public async getMyProjectIds(workspaceId: string, userId: string) {
    const projects = await prisma.project.findMany({
      where: { workspaceId, members: { some: { userId } } },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

  public async getProjectNames(_workspaceId: string, projectIds: string[]) {
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    return new Map(projects.map((project) => [project.id, project.name]));
  }

  // counts tasks per project (a task counts for its main project and any linked project)
  private async addTaskStats<T extends { id: string }>(projects: T[]) {
    const ids = new Set(projects.map((p) => p.id));
    const stats = new Map<string, { total: number; done: number }>();

    if (ids.size) {
      const tasks = await prisma.task.findMany({
        where: {
          deletedAt: null,
          OR: [
            { projectId: { in: [...ids] } },
            { projects: { some: { id: { in: [...ids] } } } },
          ],
        },
        select: { status: true, projectId: true, projects: { select: { id: true } } },
      });

      for (const task of tasks) {
        const refs = new Set([task.projectId, ...task.projects.map((p) => p.id)]);
        for (const ref of refs) {
          if (!ids.has(ref)) continue;
          const current = stats.get(ref) ?? { total: 0, done: 0 };
          current.total += 1;
          if (task.status === "done") current.done += 1;
          stats.set(ref, current);
        }
      }
    }

    return projects.map((project) => ({
      ...project,
      taskStats: stats.get(project.id) ?? { total: 0, done: 0 },
    }));
  }

  private async addMembersPreview<T extends { id: string }>(projects: T[]) {
    if (!projects.length) {
      return projects.map((p) => ({ ...p, members: [] as MemberPreview[], memberCount: 0 }));
    }

    const rows = await prisma.projectMember.findMany({
      where: { projectId: { in: projects.map((p) => p.id) } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const byProject = new Map<string, MemberPreview[]>();
    for (const row of rows) {
      const list = byProject.get(row.projectId) ?? [];
      list.push({
        id: row.user.id,
        name: row.user.name,
        avatarUrl: row.user.avatarUrl,
        role: row.role,
      });
      byProject.set(row.projectId, list);
    }

    return projects.map((project) => {
      const all = byProject.get(project.id) ?? [];
      return { ...project, members: all.slice(0, 3), memberCount: all.length };
    });
  }

  public async updateProject(projectId: string, data: IProject.UpdateObj) {
    const { dueDate, ...rest } = data;

    try {
      return await prisma.project.update({
        where: { id: projectId },
        data: { ...rest, endDate: dueDate },
      });
    } catch (error) {
      // P2025 = record not found
      if ((error as { code?: string }).code === "P2025") {
        throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
      }
      throw error;
    }
  }

  public async deleteProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    const tasks = await taskRepository.softDeleteProjectTasks(project.id);

    // members, comments, favorites and invitations are removed automatically
    // because the schema has onDelete: Cascade on them
    await prisma.project.delete({ where: { id: project.id } });

    return { project, tasks };
  }
}

export const projectRepository = new ProjectRepository();
