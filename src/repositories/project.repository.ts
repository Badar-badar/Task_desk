import type { Types } from "mongoose";
import type { IProject } from "../interfaces/iProject";
import type { MemberRole } from "../models/enums";
import { ProjectModel } from "../models/project.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import { InvitationModel } from "../models/invitation.model";
import { FavoriteModel } from "../models/favourite";
import { CommentModel } from "../models/comment.model";
import { TaskModel } from "../models/task.model";
import { taskRepository } from "./task.repository";
import { AppError } from "../utils/appError";
import { favoriteRepository } from "./favourite.repository";

class ProjectRepository {
  public async createProject(
  workspaceId: Types.ObjectId,
  userId: Types.ObjectId,
  data: IProject.CreateObj,
) {
  const { dueDate, ...rest } = data;
  const project = await ProjectModel.create({
    ...rest,
    ...(dueDate !== undefined ? { endDate: dueDate } : {}),
    workspaceId,
    ownerId: userId,
  });

    try {
      await ProjectMemberModel.create({
        projectId: project._id,
        userId,
        role: "admin",
      });
    } catch (error) {
      await ProjectModel.deleteOne({ _id: project._id }); // roll back
      throw error;
    }

    return { ...project.toObject(), role: "admin" as MemberRole };
  }

  // projects where the user is a member
public async listProjects(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
  const memberships = await ProjectMemberModel.find({ userId }).lean();
  if (!memberships.length) return [];

  const roleByProject = new Map(memberships.map((m) => [m.projectId.toString(), m.role]));
  const projects = await ProjectModel.find({
    workspaceId,                                             
    _id: { $in: memberships.map((m) => m.projectId) },
  }).sort({ createdAt: -1 }).lean();

    const withStats = await this.addTaskStats(projects);
    const withMembers = await this.addMembersPreview(withStats);

      const favoriteIds = await favoriteRepository.getFavoriteIds(
      userId,
      projects.map((p) => p._id),
    );
    return withMembers.map((project) => ({
      ...project,
      role: roleByProject.get(project._id.toString())!,
      isFavorite: favoriteIds.has(project._id.toString()),
    }));
  }

  
  public async getProject(projectId: Types.ObjectId, role: MemberRole, userId: Types.ObjectId) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    const [withStats] = await this.addTaskStats([project]);
    const [withMembers] = await this.addMembersPreview([withStats]);
  const favoriteIds = await favoriteRepository.getFavoriteIds(userId, [projectId]);
  return { ...withMembers, role, isFavorite: favoriteIds.has(projectId.toString()) };
  }

  public async countProjects(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
  const memberships = await ProjectMemberModel.find({ userId }).select("projectId").lean();
  return ProjectModel.countDocuments({
    workspaceId,
    _id: { $in: memberships.map((m) => m.projectId) },
  });
}

  public async getRecentProjects(workspaceId: Types.ObjectId, userId: Types.ObjectId, limit: number) {
  const memberships = await ProjectMemberModel.find({ userId }).select("projectId").lean();
  const projects = await ProjectModel.find({
    workspaceId,
    _id: { $in: memberships.map((m) => m.projectId) },
  }).sort({ createdAt: -1 }).limit(limit).lean();
  return this.addTaskStats(projects);
}

public async getMyProjectIds(workspaceId: Types.ObjectId, userId: Types.ObjectId) {
  const memberships = await ProjectMemberModel.find({ userId }).select("projectId").lean();
  const projects = await ProjectModel.find({
    workspaceId,
    _id: { $in: memberships.map((m) => m.projectId) },
  })
    .select("_id")
    .lean();

  return projects.map((p) => p._id);
}

  public async getProjectNames(_workspaceId: Types.ObjectId, projectIds: Types.ObjectId[]) {
    const projects = await ProjectModel.find({ _id: { $in: projectIds } })
      .select("_id name")
      .lean();
    return new Map(projects.map((project) => [project._id.toString(), project.name]));
  }

  private async addTaskStats<T extends { _id: Types.ObjectId }>(projects: T[]) {
    if (!projects.length) {
      return projects.map((project) => ({ ...project, taskStats: { total: 0, done: 0 } }));
    }

    const stats = await TaskModel.aggregate<{ _id: Types.ObjectId; total: number; done: number }>([
      { $match: { $or: [{ projectId: { $in: projects.map((project) => project._id) } }, { projectIds: { $in: projects.map((project) => project._id) } }], deletedAt: null } },
      { $project: { status: 1, projectRefs: { $setUnion: [["$projectId"], { $ifNull: ["$projectIds", []] }] } } },
      { $unwind: "$projectRefs" },
      { $match: { projectRefs: { $in: projects.map((project) => project._id) } } },
      { $group: { _id: "$projectRefs", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
    ]);
    const statsByProject = new Map(stats.map(({ _id, total, done }) => [_id.toString(), { total, done }]));

    return projects.map((project) => ({
      ...project,
      taskStats: statsByProject.get(project._id.toString()) ?? { total: 0, done: 0 },
    }));
  }

  
  private async addMembersPreview<T extends { _id: Types.ObjectId }>(projects: T[]) {
    if (!projects.length) return projects.map((p) => ({ ...p, members: [], memberCount: 0 }));

    const rows = await ProjectMemberModel.find({
      projectId: { $in: projects.map((p) => p._id) },
    })
      .populate("userId", "name avatarUrl")
      .lean();

    const byProject = new Map<string, any[]>();
    for (const row of rows as any[]) {
      const key = row.projectId.toString();
      const list = byProject.get(key) ?? [];
      list.push({
        _id: row.userId?._id,
        name: row.userId?.name,
        avatarUrl: row.userId?.avatarUrl,
        role: row.role,
      });
      byProject.set(key, list);
    }

    return projects.map((project) => {
      const all = byProject.get(project._id.toString()) ?? [];
      return { ...project, members: all.slice(0, 3), memberCount: all.length };
    });
  }

  public async updateProject(projectId: Types.ObjectId, data: IProject.UpdateObj) {
    const { dueDate, ...rest } = data;
    const changes = {
      ...rest,
      ...(dueDate !== undefined ? { endDate: dueDate } : {}),
    };

    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: changes },
      { returnDocument: 'after', runValidators: true },
    );
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    return project;
  }

  public async deleteProject(projectId: Types.ObjectId) {
    const project = await ProjectModel.findById(projectId);
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");

    const tasks = await taskRepository.softDeleteProjectTasks(project._id);

    await Promise.all([
      tasks.length ? CommentModel.deleteMany({ taskId: { $in: tasks.map((task) => task._id) } }) : Promise.resolve(),
      InvitationModel.deleteMany({ projectId: project._id }),
      FavoriteModel.deleteMany({ projectId: project._id }),
      ProjectMemberModel.deleteMany({ projectId: project._id }),
    ]);
    await ProjectModel.deleteOne({ _id: project._id });

    return { project, tasks };
  }
}

export const projectRepository = new ProjectRepository();
