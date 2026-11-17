
import type { Request, Response } from "express";
import type { IProject } from "../interfaces/iProject";
import { projectRepository} from "../repositories/project.repository";
import { deleteFile } from "../services/storage.service";


export const create = async (req: Request, res: Response) => {
  const project = await projectRepository.createProject(req.organization!._id,req.user!._id,req.body as IProject.CreateObj);

  res.status(201).json({success: true,data: project})};

export const getProjects = async (req: Request, res: Response) => {
  const projects = await projectRepository.listProjects(req.organization!._id);

  res.status(200).json({success: true,data: projects});
};

export const getOne = async (req: Request, res: Response) => {
  const project = await projectRepository.getProject(req.organization!._id,req.params.projectId as string);

  res.status(200).json({success: true,data: project});
};

export const update = async (req: Request, res: Response) => {
  const project = await projectRepository.updateProject(req.organization!._id,req.params.projectId as string,req.body as IProject.UpdateObj);

  res.status(200).json({success: true, data: project});
};

export const remove = async (req: Request, res: Response) => {
  const { tasks } = await projectRepository.deleteProject(
    req.organization!._id,
    req.params.projectId as string,
  );
  for (const task of tasks) {
    for (const attachment of task.attachments) {
      await deleteFile(attachment.key);
    }
  }

  res.status(200).json({success: true,message: "Project deleted successfully"});
};
