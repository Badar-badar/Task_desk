
import type { Types } from "mongoose";
import type { OrgRole } from "../models/enums";

export namespace IOrganization {
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
    role: OrgRole;
  }

  export interface ChangeRoleObj {
    role: OrgRole;
  }

  export interface Member {
    _id: Types.ObjectId;
    name: string;
    email: string;
    avatarUrl?: string;
    role: OrgRole;
    createdAt: Date;
  }

  export type PersistenceModel = Model;
}
