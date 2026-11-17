export const ORG_ROLES = ['owner','admin','employee'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ASSIGNABLE_ROLES = ['admin','employee'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', ] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];