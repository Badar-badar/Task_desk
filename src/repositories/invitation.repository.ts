import type { Types } from "mongoose";
import type { MemberRole } from "../models/enums";
import { InvitationModel } from "../models/invitation.model";
import { ProjectMemberModel } from "../models/projectMember.model";
import { AppError } from "../utils/appError";

class InvitationRepository {
  public async listPending(projectId: Types.ObjectId) {
    return InvitationModel.find({ projectId, status: "pending" })
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
  }

  public async updateRole(
    projectId: Types.ObjectId,
    invitationId: string,
    role: MemberRole,
  ) {
    const invitation = await InvitationModel.findOneAndUpdate(
      { _id: invitationId, projectId, status: "pending" },
      { $set: { role } },
      { returnDocument: 'after' },
    );
    if (!invitation) throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
    return invitation;
  }

  public async revoke(projectId: Types.ObjectId, invitationId: string) {
    const invitation = await InvitationModel.findOneAndUpdate(
      { _id: invitationId, projectId, status: "pending" },
      { $set: { status: "revoked" } },
      { returnDocument: 'after' },
    );
    if (!invitation) throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
    return invitation;
  }

  // called from /auth/sync: turn every pending invitation for this email into a membership
  public async acceptAllForUser(userId: Types.ObjectId, email: string) {
    const pending = await InvitationModel.find({ email, status: "pending" });
    if (!pending.length) return [];

    for (const invitation of pending) {
      // skip if already a member, but still close the invitation
      await ProjectMemberModel.updateOne(
        { projectId: invitation.projectId, userId },
        { $setOnInsert: { role: invitation.role } },
        { upsert: true },
      );

      invitation.status = "accepted";
      invitation.acceptedAt = new Date();
      await invitation.save();
    }
    return pending.map((invitation) => invitation.projectId);
  }
}

export const invitationRepository = new InvitationRepository();
