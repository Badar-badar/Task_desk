import type { ITask } from "../interfaces/iTask";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/appError";

export interface TaskFilters {
  assigneeId?: string;
  status?: ITask.Model["status"];
}

type NewAttachment = ITask.Attachment;

// every task also carries its extra linked projects (the old projectIds array)
const taskInclude = { projects: { select: { id: true } } } satisfies Prisma.TaskInclude;

// turns the `projects` relation back into the `projectIds` array your frontend already uses
const toTask = <T extends { projects: { id: string }[] }>(task: T) => {
  const { projects, ...rest } = task;
  return { ...rest, projectIds: projects.map((p) => p.id) };
};

const readAttachments = (value: Prisma.JsonValue): NewAttachment[] =>
  Array.isArray(value) ? (value as unknown as NewAttachment[]) : [];

const asJson = (value: NewAttachment[]) => value as unknown as Prisma.InputJsonValue;

// tasks that belong to any of these projects (as main project or linked project)
const inProjects = (projectIds: string[]): Prisma.TaskWhereInput => ({
  OR: [
    { projectId: { in: projectIds } },
    { projects: { some: { id: { in: projectIds } } } },
  ],
});

class TaskRepository {
  private async validateAssignee(projectId: string, assigneeId?: string | null): Promise<void> {
    if (assigneeId == null) return;

    const [member, user] = await Promise.all([
      prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: assigneeId } },
      }),
      prisma.user.findFirst({ where: { id: assigneeId, isActive: true }, select: { id: true } }),
    ]);
    if (!member || !user) {
      throw new AppError(400, "INVALID_ASSIGNEE", "Assignee must be a member of this project");
    }
  }

  public async createTask(projectId: string, createdBy: string, input: ITask.CreateObj) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    await this.validateAssignee(projectId, input.assigneeId);

    const task = await prisma.task.create({
      data: {
        ...input,
        completedAt: input.status === "done" ? new Date() : null,
        projectId: project.id,
        workspaceId: project.workspaceId,
        createdBy,
      },
      include: taskInclude,
    });
    return toTask(task);
  }

  public async listTasks(projectId: string) {
    const tasks = await prisma.task.findMany({
      where: { deletedAt: null, ...inProjects([projectId]) },
      orderBy: { createdAt: "desc" },
      include: taskInclude,
    });
    return tasks.map(toTask);
  }

  public async listTasksByProjects(projectIds: string[], filters: TaskFilters) {
    const tasks = await prisma.task.findMany({
      where: { deletedAt: null, ...inProjects(projectIds), ...filters },
      orderBy: { createdAt: "desc" },
      include: taskInclude,
    });
    return tasks.map(toTask);
  }

  public async addProjectLink(taskId: string, projectId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");

    const linked = [task.projectId, ...task.projects.map((p) => p.id)];
    if (linked.includes(projectId)) return toTask(task);

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { projects: { connect: { id: projectId } } },
      include: taskInclude,
    });
    return toTask(updated);
  }

  public async removeProjectLink(taskId: string, projectId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");

    const linked = [task.projectId, ...task.projects.map((p) => p.id)];
    if (!linked.includes(projectId)) {
      throw new AppError(404, "TASK_PROJECT_NOT_FOUND", "Task is not linked to this project");
    }
    if (linked.length <= 1) {
      throw new AppError(400, "LAST_TASK_PROJECT", "A task must remain in at least one project");
    }

    if (task.projectId === projectId) {
      // removing the main project: the first linked project becomes the main one
      const nextPrimary = task.projects[0];
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          project: { connect: { id: nextPrimary.id } },
          projects: { disconnect: { id: nextPrimary.id } },
        },
        include: taskInclude,
      });
      return toTask(updated);
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { projects: { disconnect: { id: projectId } } },
      include: taskInclude,
    });
    return toTask(updated);
  }

  public async getTask(workspaceId: string, taskId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      include: taskInclude,
    });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return toTask(task);
  }

  private async summarize(where: Prisma.TaskWhereInput) {
    const now = new Date();
    const [total, done, overdue, statusCounts] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: "done" } }),
      prisma.task.count({ where: { ...where, status: { not: "done" }, dueDate: { lt: now } } }),
      prisma.task.groupBy({ by: ["status"], where, _count: { _all: true } }),
    ]);
    return {
      total,
      done,
      overdue,
      statusBreakdown: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])),
    };
  }

  public async getTaskSummary(workspaceId: string, assigneeId?: string) {
    return this.summarize({ workspaceId, deletedAt: null, ...(assigneeId ? { assigneeId } : {}) });
  }

  public async getTaskSummaryForProjects(workspaceId: string, projectIds: string[]) {
    if (!projectIds.length) return { total: 0, done: 0, overdue: 0, statusBreakdown: {} };
    return this.summarize({ workspaceId, deletedAt: null, ...inProjects(projectIds) });
  }

  public async getMyOpenTasks(workspaceId: string, userId: string) {
    const tasks = await prisma.task.findMany({
      where: { workspaceId, assigneeId: userId, status: { not: "done" }, deletedAt: null },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 6,
      include: taskInclude,
    });
    return tasks.map(toTask);
  }

  public async getMyOpenTasksForProjects(workspaceId: string, userId: string, projectIds: string[]) {
    if (!projectIds.length) return [];
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        assigneeId: userId,
        status: { not: "done" },
        deletedAt: null,
        ...inProjects(projectIds),
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 6,
      include: taskInclude,
    });
    return tasks.map(toTask);
  }

  public async addAttachments(workspaceId: string, taskId: string, attachments: NewAttachment[]) {
    const current = await this.getTask(workspaceId, taskId);
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { attachments: asJson([...readAttachments(current.attachments), ...attachments]) },
      include: taskInclude,
    });
    return toTask(updated);
  }

  // Attachments are stored as JSON, so use their generated UUID to identify them.
  public async removeAttachment(workspaceId: string, taskId: string, attachmentId: string) {
    const current = await this.getTask(workspaceId, taskId);
    const existing = readAttachments(current.attachments);
    if (!existing.some((attachment) => attachment.id === attachmentId)) {
      throw new AppError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { attachments: asJson(existing.filter((attachment) => attachment.id !== attachmentId)) },
      include: taskInclude,
    });
    return toTask(updated);
  }

  public async updateTask(
    workspaceId: string,
    taskId: string,
    input: ITask.UpdateObj,
    attachments: NewAttachment[] = [],
  ) {
    const current = await this.getTask(workspaceId, taskId);
    await this.validateAssignee(current.projectId, input.assigneeId);

    const { status, ...fields } = input;
    const data: Prisma.TaskUncheckedUpdateInput = { ...fields };

    if (status !== undefined) {
      data.status = status;
      if (status === "done" && current.status !== "done") data.completedAt = new Date();
      else if (status !== "done" && current.status === "done") data.completedAt = null;
    }
    if (attachments.length) {
      data.attachments = asJson([...readAttachments(current.attachments), ...attachments]);
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: taskInclude,
    });
    return toTask(task);
  }

  public async deleteTask(workspaceId: string, taskId: string) {
    const task = await this.getTask(workspaceId, taskId);
    const deleted = await prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
      include: taskInclude,
    });
    return toTask(deleted);
  }

  public async softDeleteProjectTasks(projectId: string) {
    const primaryTasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: taskInclude,
    });

    const deletedIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const task of primaryTasks) {
        const nextPrimary = task.projects[0];
        if (nextPrimary) {
          // task also lives in another project: move it there instead of deleting
          await tx.task.update({
            where: { id: task.id },
            data: {
              project: { connect: { id: nextPrimary.id } },
              projects: { disconnect: { id: nextPrimary.id } },
            },
          });
        } else {
          await tx.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
          deletedIds.push(task.id);
        }
      }

      // remove this project from every other task that was only linked to it
      await tx.project.update({
        where: { id: projectId },
        data: { linkedTasks: { set: [] } },
      });
    });

    if (!deletedIds.length) return [];
    const deleted = await prisma.task.findMany({
      where: { id: { in: deletedIds } },
      include: taskInclude,
    });
    return deleted.map(toTask);
  }

  public async unassignUserFromProject(projectId: string, userId: string) {
    await prisma.task.updateMany({
      where: { projectId, assigneeId: userId, deletedAt: null },
      data: { assigneeId: null },
    });
  }
}

export const taskRepository = new TaskRepository();
