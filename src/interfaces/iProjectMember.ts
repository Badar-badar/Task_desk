import type { ProjectRole } from "../models/enums";

export namespace IProjectMember {
  export interface Model {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    projectId: string;
    userId: string;
    role: ProjectRole;
  }

  export interface UpdateObj {
    role: ProjectRole;
  }
}