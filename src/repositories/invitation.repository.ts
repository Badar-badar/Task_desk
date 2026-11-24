import {prisma} from '../config/db'
import { AppError } from "../utils/appError";
import type { MemberRole } from "../models/enums";

class InvitationRepository {
  public async listPending(projectId: string) {
    return prisma.invitation.findMany({where:{ projectId, status: "pending" },
    include:{inviter:{select:{id:true,name:true,email:true}}},
    orderBy:{createdAt:'desc'}
  });
}

  public async updateRole(
    projectId: string,
    invitationId: string,
    role: MemberRole,
  ) {
    const invitation = await prisma.invitation.findFirst({
      where:{id:invitationId,projectId,status:"pending"},
    });

    if (!invitation) throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
    return prisma.invitation.update({
      where: { id: invitation.id },
      data: { role },
    });
  }

  public async revoke(projectId: string, invitationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, projectId, status: "pending" },
    });
    if (!invitation) throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");

    return prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "revoked" },
    });
  }

  // called from /auth/sync: turn every pending invitation for this email into a membership
  public async acceptAllForUser(userId: string, email: string) {
    const pending = await prisma.invitation.findMany({
      where: { email, status: "pending" },
    });
    if (!pending.length) return [];

    for (const invitation of pending) {
      // skip if already a member, but still close the invitation
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: invitation.projectId, userId } },
        create: { projectId: invitation.projectId, userId, role: invitation.role },
        update: {},
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });
    }
    return pending.map((invitation) => invitation.projectId);
  }
}

export const invitationRepository = new InvitationRepository();
