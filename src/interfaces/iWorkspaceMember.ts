import type { Types } from "mongoose";
import type { WorkspaceRole } from "../models/enums";

export namespace IWorkspaceMember {
  export interface Model {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    role: WorkspaceRole;
    createdAt: Date;
    updatedAt: Date;
  }
}
