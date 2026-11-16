import type { Types } from "mongoose";
import type { IProject } from "../interfaces/iProject";
import { ProjectModel } from "../models/project.model";
import { AppError } from "../utils/appError";


class ProjectRepository{

public async createProject(organizationId: Types.ObjectId, userId: Types.ObjectId, data: IProject.CreateObj){
  const { dueDate, ...rest } = data;
  return ProjectModel.create({
    ...rest,
    ...(dueDate !== undefined ? { endDate: dueDate } : {}),
    organizationId,
    createdBy: userId,
  });
};

public async listProjects(organizationId: Types.ObjectId){
  return ProjectModel.find({ organizationId }).sort({ createdAt: -1 });
};

public async getProject(organizationId: Types.ObjectId, projectId: string){
  const project = await ProjectModel.findOne({ _id: projectId, organizationId });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  return project;
};

public async updateProject(organizationId: Types.ObjectId, projectId: string, data: IProject.UpdateObj) {
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



public async deleteProject(organizationId: Types.ObjectId, projectId: string){
  const project = await ProjectModel.findOneAndDelete({ _id: projectId, organizationId });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  return project;
};

}

export const projectRepository = new ProjectRepository();
