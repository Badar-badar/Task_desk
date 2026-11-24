
import type { WorkspaceRole } from "../models/enums";

export namespace IWorkspace {
  export interface Model {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    name: string;
  }

  export interface UpdateObj {
    name?: string;
  }

  export interface AddMemberObj {
    email: string;
    role: WorkspaceRole;
  }

  export interface ChangeRoleObj {
    role: WorkspaceRole;
  }

  export interface Member {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: WorkspaceRole;
    createdAt: Date;
  }

  export type PersistenceModel = Model;
}

