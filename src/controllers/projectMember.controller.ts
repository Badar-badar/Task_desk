import type { Request, Response } from "express";
import { projectMemberRepository } from "../repositories/projectMember.repository";
import { AppError } from "../utils/appError";
import type { MemberRole } from "../models/enums";
import { Types } from "mongoose";
import { sendInviteEmail } from "../services/email.service";
import { redisCacheService } from "../services/redisCache.service";

export const list = async (req: Request, res: Response) => {
  const members = await projectMemberRepository.listMembers(req.projectId!);
  res.status(200).json({ success: true, data: members });
};

export const add = async (req: Request, res: Response) => {
  const { email, role } = req.body as { email: string; role: MemberRole };

  const result = await projectMemberRepository.addMember(
    req.projectId!,
    req.user!._id,
    email,
    role,
  );
  if (!result.invited) {
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());
  }

  if (result.invited) {
    try {
      await sendInviteEmail(result.invitation.email, {
        inviterName: result.inviterName,
        projectName: result.projectName,
        role: result.invitation.role,
      });
    } catch (error) {
      console.error("Failed to send project invitation email", error);
      throw new AppError(
        502,
        "INVITATION_EMAIL_FAILED",
        "Invitation was saved, but its email could not be sent. Please try again.",
      );
    }

    res.status(201).json({
      success: true,
      invited: true,
      message: "Invitation email sent. They can join by signing up with this email address.",
      data: result.invitation,
    });
    return;
  }

  res.status(201).json({ success: true, invited: false, data: result.member });
};

export const updateRole = async (req: Request, res: Response) => {
  const member = await projectMemberRepository.updateRole(
    req.projectId!,
    req.params.userId as string,
    (req.body as { role: MemberRole }).role,
  );
  await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());
  res.status(200).json({ success: true, data: member });
};

// admin can remove anyone, any member can remove themselves (leave)
export const remove = async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const isSelf = new Types.ObjectId(userId).equals(req.user!._id);

  if (!isSelf && req.projectRole !== "admin") {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
  }

  await projectMemberRepository.removeMember(req.projectId!, userId);
  await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());
  res.status(200).json({
    success: true,
    message: isSelf ? "You left the project" : "Member removed successfully",
  });
};
