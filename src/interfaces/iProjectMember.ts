import type { Types } from "mongoose";
import type { ProjectRole } from "../models/enums";

export namespace IProjectMember {
  export interface Model {
    _id: Types.ObjectId;
    projectId: Types.ObjectId;
    userId: Types.ObjectId;
    role: ProjectRole;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    projectId: Types.ObjectId;
    userId: Types.ObjectId;
    role: ProjectRole;
  }

  export interface UpdateObj {
    role: ProjectRole;
  }
}