
import type { Types } from "mongoose";
import type { ProjectStatus, ProjectColor } from "../models/enums";

export namespace IProject {
  export interface Model {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    name: string;
    description?: string;
    status: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    ownerId: Types.ObjectId;
    color:ProjectColor,
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    name: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    dueDate?: Date;
    color?:ProjectColor;
  }

  export interface UpdateObj {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    dueDate?: Date;
    color?:ProjectColor;
  }
}
