import { Types, UpdateQuery } from "mongoose";
import { Task } from "../models/task.model";
import { ProjectModel } from "../models/project.model";
import { ITask } from "../interfaces/iTask";
import { AppError } from "../utils/appError";

class TaskRepository{
public async createTask(organizationId: Types.ObjectId, projectId: string, createdBy: Types.ObjectId, input: ITask.CreateObj) {
  const project = await ProjectModel.findOne({ _id: projectId, organizationId, deletedAt: null });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  return Task.create({
    ...input,
    organizationId,
    projectId: project._id,
    createdBy,
  });
};



public async listTasks(organizationId: Types.ObjectId, projectId: string){
  const project = await ProjectModel.findOne({ _id: projectId, organizationId, deletedAt: null });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

  return Task.find({ organizationId, projectId, deletedAt: null }).sort({ createdAt: -1 });
};



public async getTask(organizationId: Types.ObjectId, taskId: string){
  const task = await Task.findOne({ _id: taskId, organizationId, deletedAt: null });
  if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");

  return task;
};

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



public async updateTask(
  organizationId: Types.ObjectId,
  taskId: string,
  input: ITask.UpdateObj,
  attachments: ITask.NewAttachment[] = [],
) {
  const update: UpdateQuery<ITask.Model> = { $set: input };
  if (attachments.length) {
    update.$push = { attachments: { $each: attachments } };
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, organizationId, deletedAt: null },
    update,
    { new: true, runValidators: true }
  );

  if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  return task;
};

public async deleteTask(organizationId: Types.ObjectId, taskId: string){
  const task = await Task.findOneAndUpdate(
    { _id: taskId, organizationId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );

  if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  return task;
};
}

export const taskRepository = new TaskRepository();

