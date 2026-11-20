import type { Request, Response } from "express";
import { workspaceMemberRepository } from "../repositories/workspaceMember.repository";
import { AppError } from "../utils/appError";

export const list = async (req: Request, res: Response) => {
  const data = await workspaceMemberRepository.listMembers(req.workspaceId!);
  res.status(200).json({ success: true, data });
};

export const add = async (req: Request, res: Response) => {
  const data = await workspaceMemberRepository.addMember(req.workspaceId!, req.body.email);
  res.status(201).json({ success: true, data });
};

// owner removes anyone, a member can remove themselves (leave)
export const remove = async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const isSelf = userId === req.user!._id.toString();

  if (!isSelf && req.workspaceRole !== "owner") {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
  }

  await workspaceMemberRepository.removeMember(req.workspaceId!, userId);
  res.status(200).json({ success: true, message: isSelf ? "You left the workspace" : "Member removed successfully" });
};