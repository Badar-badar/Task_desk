import type { Types } from "mongoose";

export namespace IFavorite {
  export interface Model {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    projectId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    userId: Types.ObjectId;
    projectId: Types.ObjectId;
  }
}