
import type { Types } from "mongoose";
import type { ProjectStatus } from "../models/enums";

export namespace IProject {
  export interface Model {
    _id: Types.ObjectId;
    organizationId: Types.ObjectId;
    name: string;
    description?: string;
    status: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    name: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    dueDate?: Date;
  }

  export interface UpdateObj {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    dueDate?: Date;
  }
}
