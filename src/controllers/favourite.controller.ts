import type { Request, Response } from "express";
import { favoriteRepository } from "../repositories/favourite.repository";

export const toggle = async (req: Request, res: Response) => {
  const result = await favoriteRepository.toggle(req.user!._id, req.projectId!);
  res.status(200).json({ success: true, data: result });
};

export const list = async (req: Request, res: Response) => {
  const projects = await favoriteRepository.listProjects(req.user!._id);
  res.status(200).json({ success: true, data: projects });
};
