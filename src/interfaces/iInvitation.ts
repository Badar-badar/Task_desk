import type { InvitationStatus, MemberRole } from "../models/enums";

export namespace IInvitation {
  export interface Model {
    id: string;
    projectId: string;
    email: string;
    role: MemberRole;
    status: InvitationStatus;
    invitedBy: string;
    acceptedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    projectId: string;
    email: string;
    role: MemberRole;
    invitedBy: string;
  }

  export interface UpdateObj {
    role?: MemberRole | null;
    status?: InvitationStatus | null;
  }
}