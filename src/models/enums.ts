export const MEMBER_ROLES = ['admin','commenter','editor','viewer'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const ALL_ROLES: MemberRole[] = [...MEMBER_ROLES];

export const ASSIGNABLE_ROLES = ['admin','employee'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];


export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', ] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PROJECT_COLORS = [
  "#f06a6a", "#f1bd6c", "#7bc86c", "#4ecbc4",
  "#4573d2", "#8d84e8", "#e362e3", "#aa62e3",
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_ROLES = ["admin", "editor", "commenter", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];


export const INVITATION_STATUSES = ["pending", "accepted", "revoked"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const WORKSPACE_ROLES = ["owner", "member"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
