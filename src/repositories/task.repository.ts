import { Types, UpdateQuery } from "mongoose";
import { ITask } from "../interfaces/iTask";
import { ProjectModel } from "../models/project.model";
import { Task } from "../models/task.model";
import { User } from "../models/user.model";
import { AppError } from "../utils/appError";

export interface TaskFilters {
  projectId?: string;
  assigneeId?: Types.ObjectId;
  status?: ITask.Model["status"];
}

class TaskRepository {
  private async validateAssignee(
    organizationId: Types.ObjectId,
    assigneeId: ITask.CreateObj["assigneeId"],
  ): Promise<void> {
    if (assigneeId == null) return;
    if (!Types.ObjectId.isValid(assigneeId)) {
      throw new AppError(400, "INVALID_ASSIGNEE", "Assignee must be a member of this organization");
    }

    const user = await User.findOne({
      _id: assigneeId,
      organizationId,
      isActive: true,
    }).select("_id");

    if (!user) {
      throw new AppError(400, "INVALID_ASSIGNEE", "Assignee must be a member of this organization");
    }
  }

  public async createTask(
    organizationId: Types.ObjectId,
    projectId: string,
    createdBy: Types.ObjectId,
    input: ITask.CreateObj,
  ) {
    const project = await ProjectModel.findOne({ _id: projectId, organizationId });
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    await this.validateAssignee(organizationId, input.assigneeId);
    const { status, ...rest } = input;

    return Task.create({
      ...rest,
      ...(status !== undefined ? { status } : {}),
      completedAt: status === "done" ? new Date() : null,
      organizationId,
      projectId: project._id,
      createdBy,
    });
  }

  public async listTasks(organizationId: Types.ObjectId, projectId: string) {
    const project = await ProjectModel.findOne({ _id: projectId, organizationId });
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    return Task.find({ organizationId, projectId, deletedAt: null }).sort({ createdAt: -1 });
  }

  public async listOrganizationTasks(organizationId: Types.ObjectId, filters: TaskFilters) {
    return Task.find({ organizationId, deletedAt: null, ...filters }).sort({ createdAt: -1 });
  }

  public async getTask(organizationId: Types.ObjectId, taskId: string) {
    const task = await Task.findOne({ _id: taskId, organizationId, deletedAt: null });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");

    return task;
  }

  public async getTaskSummary(organizationId: Types.ObjectId, assigneeId?: Types.ObjectId) {
    const taskFilter = {
      organizationId,
      deletedAt: null,
      ...(assigneeId ? { assigneeId } : {}),
    };
    const now = new Date();
    const [total, done, overdue, statusCounts] = await Promise.all([
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: "done" }),
      Task.countDocuments({
        ...taskFilter,
        status: { $ne: "done" },
        dueDate: { $lt: now },
      }),
      Task.aggregate<{ _id: string; count: number }>([
        { $match: taskFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      done,
      overdue,
      statusBreakdown: Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count])),
    };
  }

  public async getMyOpenTasks(organizationId: Types.ObjectId, userId: Types.ObjectId) {
    return Task.find({
      organizationId,
      assigneeId: userId,
      status: { $ne: "done" },
      deletedAt: null,
    }).sort({ dueDate: 1, createdAt: -1 }).limit(6);
  }

  public async addAttachments(
    organizationId: Types.ObjectId,
    taskId: string,
    attachments: ITask.NewAttachment[],
  ) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, organizationId, deletedAt: null },
      { $push: { attachments: { $each: attachments } } },
      { new: true, runValidators: true },
    );

    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async removeAttachment(
    organizationId: Types.ObjectId,
    taskId: string,
    attachmentId: string,
  ) {
    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        organizationId,
        deletedAt: null,
        "attachments._id": attachmentId,
      },
      { $pull: { attachments: { _id: attachmentId } } },
      { new: true },
    );

    if (!task) {
      const existingTask = await Task.findOne({ _id: taskId, organizationId, deletedAt: null }).select("_id");
      if (!existingTask) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
      throw new AppError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");
    }

    return task;
  }

  public async updateTask(
    organizationId: Types.ObjectId,
    taskId: string,
    input: ITask.UpdateObj,
    attachments: ITask.NewAttachment[] = [],
  ) {
    const currentTask = await this.getTask(organizationId, taskId);
    await this.validateAssignee(organizationId, input.assigneeId);

    const { status, ...fields } = input;
    const set: UpdateQuery<ITask.Model>["$set"] = { ...fields };
    if (status !== undefined) {
      set.status = status;
      if (status === "done" && currentTask.status !== "done") {
        set.completedAt = new Date();
      } else if (status !== "done" && currentTask.status === "done") {
        set.completedAt = null;
      }
    }

    const update: UpdateQuery<ITask.Model> = { $set: set };
    if (attachments.length) {
      update.$push = { attachments: { $each: attachments } };
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, organizationId, deletedAt: null },
      update,
      { new: true, runValidators: true },
    );

    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async deleteTask(organizationId: Types.ObjectId, taskId: string) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, organizationId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );

    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return task;
  }

  public async softDeleteProjectTasks(organizationId: Types.ObjectId, projectId: Types.ObjectId) {
    const tasks = await Task.find({ organizationId, projectId, deletedAt: null });
    if (tasks.length) {
      await Task.updateMany(
        { organizationId, projectId, deletedAt: null },
        { $set: { deletedAt: new Date() } },
      );
    }
    return tasks;
  }
}

export const taskRepository = new TaskRepository();
