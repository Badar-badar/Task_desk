import { HydratedDocument, Types, UpdateQuery } from "mongoose";
import { ITask } from "../interfaces/iTask";
import { TaskModel } from "../models/task.model";
import { ProjectModel } from "../models/project.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import { User } from "../models/user.model";
import { AppError } from "../utils/appError";

export interface TaskFilters {
  assigneeId?: Types.ObjectId;
  status?: ITask.Model["status"];
}

class TaskRepository {
  private async validateAssignee(projectId: Types.ObjectId | string, assigneeId: ITask.CreateObj["assigneeId"]): Promise<void> {
    if (assigneeId == null) return;
    if (!Types.ObjectId.isValid(assigneeId)) {
      throw new AppError(400, "INVALID_ASSIGNEE", "Assignee must be a member of this project");
    }
    const [member, user] = await Promise.all([
      ProjectMemberModel.exists({ projectId, userId: assigneeId }),
      User.exists({ _id: assigneeId, isActive: true }),
    ]);
    if (!member || !user) {
      throw new AppError(400, "INVALID_ASSIGNEE", "Assignee must be a member of this project");
    }
  }

  public async createTask(projectId: Types.ObjectId, createdBy: Types.ObjectId, input: ITask.CreateObj) {
    const project = await ProjectModel.findById(projectId).select("_id workspaceId");
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    await this.validateAssignee(projectId, input.assigneeId);
    const { status, ...rest } = input;
    return TaskModel.create({
      ...rest,
      ...(status !== undefined ? { status } : {}),
      completedAt: status === "done" ? new Date() : null,
      projectId: project._id,
      workspaceId: project.workspaceId,
      createdBy,
    });
  }

  public async listTasks(projectId: Types.ObjectId) {
    return TaskModel.find({ $or: [{ projectId }, { projectIds: projectId }], deletedAt: null }).sort({ createdAt: -1 });
  }

  public async listTasksByProjects(projectIds: Types.ObjectId[], filters: TaskFilters) {
    return TaskModel.find({ $or: [{ projectId: { $in: projectIds } }, { projectIds: { $in: projectIds } }], deletedAt: null, ...filters }).sort({ createdAt: -1 });
  }

  public async addProjectLink(task: HydratedDocument<ITask.Model>, projectId: Types.ObjectId) {
    const linked = [task.projectId, ...(task.projectIds ?? [])];
    if (!linked.some((id) => id.equals(projectId))) {
      task.projectIds = [...(task.projectIds ?? []), projectId];
      await task.save();
    }
    return task;
  }

  public async removeProjectLink(task: HydratedDocument<ITask.Model>, projectId: Types.ObjectId) {
    const linked = [task.projectId, ...(task.projectIds ?? [])];
    if (!linked.some((id) => id.equals(projectId))) throw new AppError(404, "TASK_PROJECT_NOT_FOUND", "Task is not linked to this project");
    if (linked.length <= 1) throw new AppError(400, "LAST_TASK_PROJECT", "A task must remain in at least one project");
    if (task.projectId.equals(projectId)) {
      const [nextPrimary, ...remaining] = task.projectIds ?? [];
      task.projectId = nextPrimary;
      task.projectIds = remaining;
    } else {
      task.projectIds = (task.projectIds ?? []).filter((id) => !id.equals(projectId));
    }
    await task.save();
    return task;
  }

  public async getTask(workspaceId: Types.ObjectId, taskId: string) {
    const task = await TaskModel.findOne({ _id: taskId, workspaceId, deletedAt: null });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async getTaskSummary(workspaceId: Types.ObjectId, assigneeId?: Types.ObjectId) {
    const filter = { workspaceId, deletedAt: null, ...(assigneeId ? { assigneeId } : {}) };
    const now = new Date();
    const [total, done, overdue, statusCounts] = await Promise.all([
      TaskModel.countDocuments(filter),
      TaskModel.countDocuments({ ...filter, status: "done" }),
      TaskModel.countDocuments({ ...filter, status: { $ne: "done" }, dueDate: { $lt: now } }),
      TaskModel.aggregate<{ _id: string; count: number }>([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);
    return { total, done, overdue, statusBreakdown: Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count])) };
  }

  public async getMyOpenTasks(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
    return TaskModel.find({ workspaceId, assigneeId: userId, status: { $ne: "done" }, deletedAt: null })
      .sort({ dueDate: 1, createdAt: -1 }).limit(6);
  }

  public async addAttachments(workspaceId: Types.ObjectId, taskId: string, attachments: ITask.NewAttachment[]) {
    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, workspaceId, deletedAt: null },
      { $push: { attachments: { $each: attachments } } },
      { new: true, runValidators: true },
    );
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async removeAttachment(workspaceId: Types.ObjectId, taskId: string, attachmentId: string) {
    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, workspaceId, deletedAt: null, "attachments._id": attachmentId },
      { $pull: { attachments: { _id: attachmentId } } }, { new: true },
    );
    if (!task) {
      const exists = await TaskModel.exists({ _id: taskId, workspaceId, deletedAt: null });
      if (!exists) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
      throw new AppError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");
    }
    return task;
  }

  public async updateTask(workspaceId: Types.ObjectId, taskId: string, input: ITask.UpdateObj, attachments: ITask.NewAttachment[] = []) {
    const current = await this.getTask(workspaceId, taskId);
    await this.validateAssignee(current.projectId, input.assigneeId);
    const { status, ...fields } = input;
    const set: UpdateQuery<ITask.Model>["$set"] = { ...fields };
    if (status !== undefined) {
      set.status = status;
      if (status === "done" && current.status !== "done") set.completedAt = new Date();
      else if (status !== "done" && current.status === "done") set.completedAt = null;
    }
    const update: UpdateQuery<ITask.Model> = { $set: set };
    if (attachments.length) update.$push = { attachments: { $each: attachments } };
    const task = await TaskModel.findOneAndUpdate({ _id: taskId, workspaceId, deletedAt: null }, update, { new: true, runValidators: true });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async deleteTask(workspaceId: Types.ObjectId, taskId: string) {
    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, workspaceId, deletedAt: null }, { $set: { deletedAt: new Date() } }, { new: true },
    );
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async softDeleteProjectTasks(projectId: Types.ObjectId) {
    const primaryTasks = await TaskModel.find({ projectId, deletedAt: null });
    const deletedTasks: typeof primaryTasks = [];
    for (const task of primaryTasks) {
      const [nextPrimary, ...remaining] = task.projectIds ?? [];
      if (nextPrimary) {
        task.projectId = nextPrimary;
        task.projectIds = remaining;
        await task.save();
      } else {
        task.deletedAt = new Date();
        await task.save();
        deletedTasks.push(task);
      }
    }
    await TaskModel.updateMany({ projectIds: projectId, projectId: { $ne: projectId }, deletedAt: null }, { $pull: { projectIds: projectId } });
    return deletedTasks;
  }

  public async unassignUserFromProject(projectId: Types.ObjectId, userId: Types.ObjectId) {
    await TaskModel.updateMany({ projectId, assigneeId: userId, deletedAt: null }, { $set: { assigneeId: null } });
  }
}

export const taskRepository = new TaskRepository();
