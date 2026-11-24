import type { Request, Response } from "express";
import { commentRepository } from "../repositories/comment.repository";

export const list = async (req: Request, res: Response) => {
  const comments = await commentRepository.listByTask(req.task!.id);
  res.status(200).json({ success: true, data: comments });
};

export const create = async (req: Request, res: Response) => {
  const comment = await commentRepository.create({
    taskId: req.task!.id,
    projectId: req.projectId!,
    authorId: req.user!.id,
    body: (req.body as { body: string }).body,
  });
  res.status(201).json({ success: true, data: comment });
};

export const update = async (req: Request, res: Response) => {
  const comment = await commentRepository.updateBody(
    req.comment!.id,
    (req.body as { body: string }).body,
  );
  res.status(200).json({ success: true, data: comment });
};

export const remove = async (req: Request, res: Response) => {
  await commentRepository.softDelete(req.comment!.id);
  res.status(200).json({ success: true, message: "Comment deleted successfully" });
};
