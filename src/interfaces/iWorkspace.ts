
import type { Types } from "mongoose";
import type { WorkspaceRole } from "../models/enums";

export namespace IWorkspace {
  export interface Model {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    ownerId: Types.ObjectId;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    name: string;
    description?: string;
  }

  export interface UpdateObj {
    name?: string;
    description?: string;
  }

  export interface AddMemberObj {
    email: string;
    role: WorkspaceRole;
  }

  export interface ChangeRoleObj {
    role: WorkspaceRole;
  }

  export interface Member {
    _id: Types.ObjectId;
    name: string;
    email: string;
    avatarUrl?: string;
    role: WorkspaceRole;
    createdAt: Date;
  }

  export type PersistenceModel = Model;
}

