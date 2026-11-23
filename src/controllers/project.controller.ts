import type { Request, Response } from "express";
import type { IProject } from "../interfaces/iProject";
import { projectRepository } from "../repositories/project.repository";
import { deleteFile } from "../services/storage.service";
import { redisCacheService } from "../services/redisCache.service";

export const create = async (req: Request, res: Response) => {
  const project = await projectRepository.createProject(
    req.workspaceId!,
    req.user!._id,
    req.body as IProject.CreateObj,
  );
  await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());
  res.status(201).json({ success: true, data: project });
};

export const getProjects = async (req: Request, res: Response) => {
  const workspaceId = req.workspaceId!.toString();
  const userId = req.user!._id.toString();
  const key = redisCacheService.projectListKey(workspaceId, userId);
  const cached = await redisCacheService.get<unknown[]>(key);
  const projects = cached ?? await projectRepository.listProjects(req.workspaceId!, req.user!._id);
  if (!cached) await redisCacheService.set(key, projects, redisCacheService.listTtlSeconds);
  res.status(200).json({ success: true, data: projects });
};

export const getOne = async (req: Request, res: Response) => {
  const project = await projectRepository.getProject(
    req.projectId!,
    req.projectRole!,
    req.user?._id!,
  );

  res.status(200).json({ success: true, data: project });
};

export const update = async (req: Request, res: Response) => {
  const project = await projectRepository.updateProject(
    req.projectId!,
    req.body as IProject.UpdateObj,
  );
  await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());

  res.status(200).json({ success: true, data: project });
};

export const remove = async (req: Request, res: Response) => {
  const { project, tasks } = await projectRepository.deleteProject(req.projectId!);
  await redisCacheService.invalidateWorkspaceLists(project.workspaceId.toString());

  for (const task of tasks) {
    for (const attachment of task.attachments) {
      await deleteFile(attachment.key);
    }
  }

  res.status(200).json({ success: true, message: "Project deleted successfully" });
};
