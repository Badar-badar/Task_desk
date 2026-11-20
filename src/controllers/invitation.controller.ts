import type { Request, Response } from "express";
import type { MemberRole } from "../models/enums";
import { invitationRepository } from "../repositories/invitation.repository";

export const list = async (req: Request, res: Response) => {
  const data = await invitationRepository.listPending(req.projectId!);
  res.status(200).json({ success: true, data });
};

export const updateRole = async (req: Request, res: Response) => {
  const { invitationId } = req.params;
  const { role } = req.body as { role: MemberRole };
  const data = await invitationRepository.updateRole(req.projectId!, invitationId as string, role);
  res.status(200).json({ success: true, data });
};

export const revoke = async (req: Request, res: Response) => {
  const { invitationId } = req.params;
  const data = await invitationRepository.revoke(req.projectId!, invitationId as string);
  res.status(200).json({ success: true, data });
};
