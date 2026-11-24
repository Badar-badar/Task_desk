import type { ProjectStatus, ProjectColor } from "../models/enums";

export namespace IProject {
  export interface Model {
    id: string;
    workspaceId: string;
    name: string;
    description?: string | null;
    status: ProjectStatus;
    startDate?: Date | null;
    endDate?: Date | null;
    ownerId: string;
    color: ProjectColor;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    name: string;
    description?: string | null;
    status?: ProjectStatus;
    startDate?: Date | null;
    dueDate?: Date | null;
    color?: ProjectColor;
  }

  export interface UpdateObj {
    name?: string;
    description?: string | null;
    status?: ProjectStatus;
    startDate?: Date | null;
    dueDate?: Date | null;
    color?: ProjectColor;
  }
}
