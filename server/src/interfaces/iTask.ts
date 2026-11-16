
import { Types } from "mongoose";
import { TaskStatus } from "../models/enums";

export namespace ITask {
  export interface Model {
    _id: Types.ObjectId;
    organizationId: Types.ObjectId;
    projectId: Types.ObjectId;
    title: string;
    description?: string;
    status: TaskStatus;
    assigneeId?: Types.ObjectId | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
    createdBy: Types.ObjectId;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    title: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: Date;
    completedAt?: Date;
  }

  export interface UpdateObj {
    title?: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: Date;
    completedAt?: Date;
  }
}
