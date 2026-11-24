import { TaskPriority, TaskStatus } from "../models/enums";

export namespace ITask {
  export interface Attachment {
    id: string;
    key: string;
    fileName: string;
    mimeType: string;
    size: number;
  }

  export interface Model {
    id: string;
    workspaceId: string;
    projectId: string;
    projectIds?: string[];
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId?: string | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
    attachments: Attachment[];
    createdBy: string;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: Date | null;
  }

  export interface UpdateObj {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: Date | null;
  }
}
