import type { WorkspaceRole } from "../models/enums";

export namespace IWorkspaceMember {
  export interface Model {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: Date;
    updatedAt: Date;
  }
}
