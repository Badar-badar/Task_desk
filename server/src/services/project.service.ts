import type { Types } from "mongoose";
import type { IProject } from "../interfaces/iProject";
import { ProjectModel } from "../models/project.model";
import { AppError } from "../utils/appError";

export const createProject = async (organizationId: Types.ObjectId, userId: Types.ObjectId, data: IProject.CreateObj) => {
  const { dueDate, ...rest } = data;
  return ProjectModel.create({
    ...rest,
    ...(dueDate !== undefined ? { endDate: dueDate } : {}),
    organizationId,
    createdBy: userId,
  });
};

export const listProjects = async (organizationId: Types.ObjectId) => {
  return ProjectModel.find({ organizationId }).sort({ createdAt: -1 });
};

export const getProject = async (organizationId: Types.ObjectId, projectId: string) => {
  const project = await ProjectModel.findOne({ _id: projectId, organizationId });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  return project;
};

export const updateProject = async (organizationId: Types.ObjectId, projectId: string, data: IProject.UpdateObj) => {
  const { dueDate, ...rest } = data;
  const changes = {
    ...rest,
    ...(dueDate !== undefined ? { endDate: dueDate } : {}),
  };

  const project = await ProjectModel.findOneAndUpdate(
    { _id: projectId, organizationId },
    { $set: changes },
    { new: true, runValidators: true }
  );
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

  return project;
};



export const deleteProject = async (organizationId: Types.ObjectId, projectId: string) => {
  const project = await ProjectModel.findOneAndDelete({ _id: projectId, organizationId });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  return project;
};