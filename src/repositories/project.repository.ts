import type { Types } from "mongoose";
import type { IProject } from "../interfaces/iProject";
import { ProjectModel } from "../models/project.model";
import { Task } from "../models/task.model";
import { taskRepository } from "./task.repository";
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
  const projects = await ProjectModel.find({ organizationId }).sort({ createdAt: -1 }).lean();
  return this.addTaskStats(organizationId, projects);
};

public async getProject(organizationId: Types.ObjectId, projectId: string){
  const project = await ProjectModel.findOne({ _id: projectId, organizationId }).lean();
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  const [projectWithStats] = await this.addTaskStats(organizationId, [project]);
  return projectWithStats;
};

public async countProjects(organizationId: Types.ObjectId) {
  return ProjectModel.countDocuments({ organizationId });
}

public async getRecentProjects(organizationId: Types.ObjectId, limit: number) {
  const projects = await ProjectModel.find({ organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return this.addTaskStats(organizationId, projects);
}

public async getProjectNames(organizationId: Types.ObjectId, projectIds: Types.ObjectId[]) {
  const projects = await ProjectModel.find({ organizationId, _id: { $in: projectIds } })
    .select("_id name")
    .lean();
  return new Map(projects.map((project) => [project._id.toString(), project.name]));
}

private async addTaskStats<T extends { _id: Types.ObjectId }>(
  organizationId: Types.ObjectId,
  projects: T[],
) {
  if (!projects.length) return projects.map((project) => ({ ...project, taskStats: { total: 0, done: 0 } }));

  const stats = await Task.aggregate<{ _id: Types.ObjectId; total: number; done: number }>([
    {
      $match: {
        organizationId,
        projectId: { $in: projects.map((project) => project._id) },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$projectId",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
      },
    },
  ]);
  const statsByProject = new Map(stats.map(({ _id, total, done }) => [_id.toString(), { total, done }]));

  return projects.map((project) => ({
    ...project,
    taskStats: statsByProject.get(project._id.toString()) ?? { total: 0, done: 0 },
  }));
}

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
  const project = await ProjectModel.findOne({ _id: projectId, organizationId });
  if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  const tasks = await taskRepository.softDeleteProjectTasks(organizationId, project._id);
  await ProjectModel.deleteOne({ _id: project._id, organizationId });
  return { project, tasks };
};

}

export const projectRepository = new ProjectRepository();
