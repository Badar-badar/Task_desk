import type { Request, Response } from "express";
import { favoriteRepository } from "../repositories/favourite.repository";
import { redisCacheService } from "../services/redisCache.service";

export const toggle = async (req: Request, res: Response) => {
  const result = await favoriteRepository.toggle(req.user!.id, req.projectId!);
  await redisCacheService.invalidateUserProjectList(
    req.workspaceId!,
    req.user!.id,
  );
  res.status(200).json({ success: true, data: result });
};

export const list = async (req: Request, res: Response) => {
  const projects = await favoriteRepository.listProjects(req.user!.id);
  res.status(200).json({ success: true, data: projects });
};
