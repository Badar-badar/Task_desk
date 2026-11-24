import type { WorkspaceRole } from "../models/enums";

export interface IUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLogin?: Date | null;
  workspaceId?: string | null;
  role?: WorkspaceRole | null;
  createdAt: Date;
  updatedAt: Date;
}