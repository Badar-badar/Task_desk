import type { DecodedIdToken } from "firebase-admin/auth";
import type { HydratedDocument, Types } from "mongoose";
import type { IComment } from "../interfaces/iComment";
import type { IWorkspace } from "../interfaces/iWorkspace";
import type { ITask } from "../interfaces/iTask";
import type { WorkspaceRole, MemberRole } from "../models/enums";
import type { IUser } from "../models/user.model";

type AuthenticatedUser = HydratedDocument<IUser & {
  workspaceId?: Types.ObjectId | null;
  role?: WorkspaceRole | null;
}>;

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
      user?: AuthenticatedUser;
      workspace?: HydratedDocument<IWorkspace.PersistenceModel>;
      workspaceId?: Types.ObjectId;
      workspaceRole?: WorkspaceRole;
      projectId?: Types.ObjectId;
      projectRole?: MemberRole;
      task?: HydratedDocument<ITask.Model>;
      comment?: HydratedDocument<IComment.Model>;
    }
  }
}

export {};
