import type { Types } from "mongoose";

export namespace IComment {
  export interface Model {
    _id: Types.ObjectId;
    taskId: Types.ObjectId;
    projectId: Types.ObjectId;
    authorId: Types.ObjectId;
    body: string;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    taskId: Types.ObjectId;
    projectId: Types.ObjectId;
    authorId: Types.ObjectId;
    body: string;
  }

  export interface UpdateObj {
    body: string;
  }
}