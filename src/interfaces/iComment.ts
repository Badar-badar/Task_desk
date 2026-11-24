export namespace IComment {
  export interface Model {
    id: string;
    taskId: string;
    projectId: string;
    authorId: string;
    body: string;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    taskId: string;
    projectId: string;
    authorId: string;
    body: string;
  }

  export interface UpdateObj {
    body: string;
  }
}