import { Types } from "mongoose";
import { Task } from "../models/task.model";
import { ProjectModel } from "../models/project.model";
import { ITask } from "../interfaces/iTask";
import { AppError } from "../utils/appError";

export const createTask = async (organizationId: Types.ObjectId, projectId: string, createdBy: Types.ObjectId, input: ITask.CreateObj) => {
  const project = await ProjectModel.findOne({ _id: projectId, organizationId, deletedAt: null });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  return Task.create({
    ...input,
    organizationId,
    projectId: project._id,
    createdBy,
  });
};



export const listTasks = async (organizationId: Types.ObjectId, projectId: string) => {
  const project = await ProjectModel.findOne({ _id: projectId, organizationId, deletedAt: null });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

  return Task.find({ organizationId, projectId, deletedAt: null }).sort({ createdAt: -1 });
};



export const getTask = async (organizationId: Types.ObjectId, taskId: string) => {
  const task = await Task.findOne({ _id: taskId, organizationId, deletedAt: null });
  if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");

  return task;
};



export const updateTask = async (organizationId: Types.ObjectId, taskId: string, input: ITask.UpdateObj) => {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, organizationId, deletedAt: null },
    { $set: input },
    { new: true, runValidators: true }
  );

  if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  return task;
};

export const deleteTask = async (organizationId: Types.ObjectId, taskId: string) => {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, organizationId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );

  if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  return task;
};