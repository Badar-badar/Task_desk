import type { Types } from "mongoose";
import type { InvitationStatus, MemberRole } from "../models/enums";

export namespace IInvitation {
  export interface Model {
    _id: Types.ObjectId;
    projectId: Types.ObjectId;
    email: string;
    role: MemberRole;
    status: InvitationStatus;
    invitedBy: Types.ObjectId;
    acceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    projectId: Types.ObjectId;
    email: string;
    role: MemberRole;
    invitedBy: Types.ObjectId;
  }

  export interface UpdateObj {
    role?: MemberRole;
    status?: InvitationStatus;
  }
}