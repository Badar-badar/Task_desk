
export namespace IFavorite {
  export interface Model {
    id: string;
    userId: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface CreateObj {
    userId: string;
    projectId: string;
  }
}