import crypto from "crypto";
import type { Workspace } from "../generated/prisma/client";
import { prisma } from "../config/db";
import { projectRepository } from "./project.repository";
import { AppError } from "../utils/appError";

const makeSlug = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${crypto.randomBytes(3).toString("hex")}`;

type WorkspaceWithRole = Workspace & { role: string };

class WorkspaceRepository {
  public async createWorkspace(userId: string, name: string) {
    // workspace + owner membership are created together, if one fails both are cancelled
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: makeSlug(name),
        ownerId: userId,
        members: { create: { userId, role: "owner" } },
      },
    });
    return { ...workspace, role: "owner" as const };
  }

  // for the sidebar switcher
  public async listMine(userId: string) {
    const rows = await prisma.workspaceMember.findMany({
      where: { userId, workspace: { deletedAt: null } },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const workspaces = new Map<string, WorkspaceWithRole>(
      rows.map((row) => [row.workspace.id, { ...row.workspace, role: row.role }]),
    );

    // workspaces where the user is only a member of a project (guest)
    const guestWorkspaces = await prisma.workspace.findMany({
      where: {
        deletedAt: null,
        id: { notIn: [...workspaces.keys()] },
        projects: { some: { members: { some: { userId } } } },
      },
    });
    for (const workspace of guestWorkspaces) {
      workspaces.set(workspace.id, { ...workspace, role: "project_member" });
    }

    return [...workspaces.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  public async getWorkspace(workspaceId: string, role: string) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
    return { ...workspace, role };
  }

  public async updateWorkspace(workspaceId: string, data: { name?: string }) {
    const existing = await prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");

    return prisma.workspace.update({ where: { id: workspaceId }, data });
  }

  // returns tasks so the controller can delete the attachment files
  public async deleteWorkspace(workspaceId: string) {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    const allTasks = [];
    for (const project of projects) {
      const { tasks } = await projectRepository.deleteProject(project.id);
      allTasks.push(...tasks);
    }

    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });
    return { tasks: allTasks };
  }
}

export const workspaceRepository = new WorkspaceRepository();