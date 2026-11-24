import type { DecodedIdToken } from "firebase-admin/auth";
import type { Comment, Task, User, Workspace } from "../generated/prisma/client";
import type { WorkspaceRole, MemberRole } from "../models/enums";

type TaskWithProjectIds = Task & { projectIds: string[] };

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
      user?: User;
      workspace?: Workspace;
      workspaceId?: string;
      workspaceRole?: WorkspaceRole;
      workspaceProjectScoped?: boolean;
      projectId?: string;
      projectRole?: MemberRole;
      task?: TaskWithProjectIds;
      comment?: Comment;
    }
  }
}

export {};
