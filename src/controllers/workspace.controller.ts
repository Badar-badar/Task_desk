import type { Request, Response } from "express";
import type { ITask } from "../interfaces/iTask";
import { workspaceRepository } from "../repositories/workspace.repository";
import { deleteFile } from "../services/storage.service";

export const create = async (req: Request, res: Response) => {
  const data = await workspaceRepository.createWorkspace(req.user!.id, req.body.name);
  res.status(201).json({ success: true, data });
};

export const listMine = async (req: Request, res: Response) => {
  const data = await workspaceRepository.listMine(req.user!.id);
  res.status(200).json({ success: true, data });
};

export const getOne = async (req: Request, res: Response) => {
  const data = await workspaceRepository.getWorkspace(req.workspaceId!, req.workspaceRole!);
  res.status(200).json({ success: true, data });
};

export const update = async (req: Request, res: Response) => {
  const data = await workspaceRepository.updateWorkspace(req.workspaceId!, req.body);
  res.status(200).json({ success: true, data });
};

export const remove = async (req: Request, res: Response) => {
  const { tasks } = await workspaceRepository.deleteWorkspace(req.workspaceId!);
  for (const task of tasks) {
    const attachments = Array.isArray(task.attachments)
      ? (task.attachments as unknown as ITask.Attachment[])
      : [];
    for (const attachment of attachments) await deleteFile(attachment.key);
  }
  res.status(200).json({ success: true, message: "Workspace deleted successfully" });
};
