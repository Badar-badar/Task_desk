
import { Types } from "mongoose";
import { TaskStatus } from "../models/enums";

export namespace ITask {
  export interface Attachment {
    _id: Types.ObjectId;
    key: string;
    fileName: string;
    mimeType: string;
    size: number;
  }

  export type NewAttachment = Omit<Attachment, "_id">;

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
    attachments: Attachment[];
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
