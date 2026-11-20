# Task Desk API Reference

This reference follows the Express routes, validators, controllers, models, and repositories currently in `src/`. The API has base path `/api/v1`; examples below omit that prefix. The active implementation has several cross-file inconsistencies called out in [Implementation caveats](#implementation-caveats).

## Conventions

- The server listens on `PORT`; health is `GET /api/v1/health`.
- Protected routes use `Authorization: Bearer <Firebase ID token>`. `authenticate` verifies the Firebase token, loads the local user, and requires `isActive`. Call `POST /auth/sync` before other protected routes for a new user.
- Project and task routes also require `x-workspace-id: <workspace ObjectId>`. The user must be a member of that active workspace. `/workspace/:workspaceId/...` routes take the workspace ID in the path.
- Project role is one of `admin`, `editor`, `commenter`, or `viewer`. Workspace role is `owner` or `member`. Task access generally follows the project role; the assigned user is additionally allowed to update only task status and to manage task attachments.
- JSON is expected unless an endpoint says `multipart/form-data`. IDs are MongoDB ObjectId strings. Date fields are coerced to JavaScript dates, normally supplied as ISO 8601 strings.
- Uploads use multipart field `files`, up to 5 files per request and 10 MiB per file. Accepted MIME types: JPEG, PNG, WebP, PDF. Attachment responses include metadata plus a signed `url` expiring after one hour.

Errors handled by the shared error middleware have shape `{ "success": false, "message": "...", "stack": "..." }`; `stack` is omitted only when `NODE_ENV` is exactly `production`. The internal `AppError.code` is not returned. Multer file-size failures are `413`, wrong upload field/count is `400`, unsupported MIME type is `415`. Unhandled exceptions return `500` and message `Internal server Error`.

## Health and authentication

### `GET /health`

No auth. Returns `200` `{ "status": "ok", "app": "Task Desk", "db": "connected" }`; `db` is `connected` or `disconnected`.

### `POST /auth/sync`

Requires a valid Firebase bearer token; does not require an existing local user. Optional strict JSON body: `{ "name": "string" }` (trimmed, 1–100 chars). Creates a local user if needed and updates `lastLogin`; the supplied name is used only on first creation. The sync flow does not currently apply pending invitations.

Returns `200` `{ "success": true, "user": <user document> }`. User fields include `_id`, `firebaseUid`, `name`, `email`, `isActive`, optional `lastLogin`, `workspaceId`, `role`, and timestamps. Errors: `400` invalid body or Firebase account without email; `401` invalid/missing token; `500` unexpected error.

### `GET /auth/me`

Requires an active, synced Firebase user; no workspace required. Returns `200` `{ "success": true, "user": <user document> }`. Errors: `401` missing/invalid token or local user; `403` deactivated user.

## Workspaces

### `POST /workspace`

Authenticated user. Strict JSON body `{ "name": "string" }`, trimmed, 2–120 chars. Creates a workspace and owner membership. Returns `201` `{ "success": true, "data": <workspace with role: "owner"> }`.

### `GET /workspace`

Lists the caller's non-deleted workspaces, ordered by membership creation time. Returns `200` `{ "success": true, "data": [<workspace fields plus role>] }`.

### `GET /workspace/:workspaceId`

Requires workspace membership. Returns `200` `{ "success": true, "data": <workspace fields plus caller role> }`. Invalid ID: `400`; missing workspace or membership: `404 Workspace not found`.

### `PATCH /workspace/:workspaceId`

Owner only. Strict JSON body requires at least one field: `name` (optional, trimmed, 2–120 chars). Returns updated workspace in `data`. Invalid/empty body or ID: `400`; forbidden: `403`; absent workspace: `404`.

### `DELETE /workspace/:workspaceId`

Owner only. Deletes workspace projects, project data and task attachments, removes workspace memberships, then soft-deletes the workspace. Returns `200` `{ "success": true, "message": "Workspace deleted successfully" }`.

### `GET /workspace/:workspaceId/members`

Any workspace member. Returns `200` with members ordered oldest first. A member has `_id`, `name`, `email`, optional `avatarUrl`, `role` (`owner` or `member`) and `joinedAt`.

### `POST /workspace/:workspaceId/members`

Owner only. Strict body `{ "email": "valid email" }`; email is trimmed/lowercased. Adds an already-registered active user as a `member`. Returns `201` member in `data`. `404` if the user has not signed up; `409` if already a member.

### `DELETE /workspace/:workspaceId/members/:userId`

The owner can remove any non-owner member; a member can leave by removing themselves. Removal also removes their project memberships/favorites and unassigns their tasks. Returns `200` with message `Member removed successfully` or `You left the workspace`. Invalid IDs: `400`; forbidden: `403`; missing member: `404`; attempting to remove the owner: `400`.

## Projects

All `/project` routes require authentication and `x-workspace-id` for an active workspace membership. Project visibility/action is additionally governed by project membership.

### `GET /project`

Returns projects in the active workspace where caller is a project member, newest first. Each result includes project model fields (`_id`, `workspaceId`, `name`, optional `description`, `status`, optional `startDate`/`endDate`, `color`, `ownerId`, timestamps), caller `role`, `isFavorite`, `taskStats: { total, done }`, up to 3 `members`, and `memberCount`.

### `POST /project`

Workspace member. Strict JSON body:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Required, trimmed, 2–150 chars |
| `description` | string | Optional, trimmed, max 2,000 chars |
| `status` | `active \| on_hold \| completed` | Optional; defaults to `active` |
| `startDate` | date | Optional |
| `dueDate` | date | Optional; persisted as `endDate` |
| `color` | one of `#f06a6a`, `#f1bd6c`, `#7bc86c`, `#4ecbc4`, `#4573d2`, `#8d84e8`, `#e362e3`, `#aa62e3` | Optional; otherwise random default |

Returns `201` project in `data`; creator becomes project `admin`.

### `GET /project/:projectId`

Any project member. Returns the project with role, favorite flag, task stats, member preview and count as above. Invalid ID: `400`; nonmember or absent project: `404`.

### `PATCH /project/:projectId`

Project `admin` only. Strict body requires at least one of the same fields as project creation, all optional. Returns updated project in `data`. Invalid ID/body: `400`; forbidden: `403`; absent project: `404`.

### `DELETE /project/:projectId`

Project `admin` only. Deletes the project and associated comments, invitations, favorites and memberships; soft-deletes its tasks and deletes task attachment objects. Returns `200` `{ "success": true, "message": "Project deleted successfully" }`.

### `GET /project/:projectId/members`

Any project member. Returns members oldest first: `_id`, `name`, `email`, optional `avatarUrl`, `role`, `joinedAt`.

### `POST /project/:projectId/members`

Project `admin` only. Strict body `{ "email": "valid email", "role": "admin|commenter|editor|viewer" }`; role defaults to `editor`. Existing active user is added immediately (`201`, `{ success, invited: false, data: member }`). If no active account exists for that email, creates/updates a pending invitation (`201`, `{ success, invited: true, message, data: invitation }`). Duplicate member: `409`.

### `PATCH /project/:projectId/members/:userId`

Project `admin` only. Strict body `{ "role": "admin|commenter|editor|viewer" }`. Returns updated member. Invalid ID/body: `400`; missing member: `404`; demoting the last admin: `400` (`A project must have at least one admin. Make someone else admin first`).

### `DELETE /project/:projectId/members/:userId`

Any member may remove themselves to leave; an `admin` may remove another member. Removes favorite and clears that member's task assignments. Returns `200` with `You left the project` or `Member removed successfully`. Removing the last admin returns `400`; forbidden: `403`; missing member: `404`.

### `GET /project/:projectId/invitations`

Project `admin` only. Lists pending invitations newest first, with `invitedBy` populated with name/email. Returns `{ success, data: [...] }`.

### `PATCH /project/:projectId/invitations/:invitationId`

Project `admin` only. Strict body `{ "role": "admin|commenter|editor|viewer" }`. Updates role on a pending invitation and returns it in `data`. Invalid ID/body: `400`; absent/nonpending invitation: `404`.

### `DELETE /project/:projectId/invitations/:invitationId`

Project `admin` only. Changes a pending invitation status to `revoked`, returns updated invitation in `data`. Invalid ID: `400`; absent/nonpending invitation: `404`.

### `POST /project/:projectId/favorite`

Any project member. Toggles caller's favorite state. Returns `200` `{ "success": true, "data": { "isFavorite": true } }` (or `false` when removed).

### `GET /favorite`

Requires authentication; returns the caller's still-accessible favorite projects, ordered most recently favorited first. Project fields selected are `_id`, `name`, `color`, and `status`; envelope is `{ "success": true, "data": [...] }`.

## Tasks and attachments

Task routes require authentication and `x-workspace-id`. A caller must be a member of the task's project. Project `admin` and `editor` can create/update/delete tasks and manage attachments. A task assignee may update only `status` and add/remove attachments. `commenter` and `viewer` can read tasks.

Task fields: `_id`, `projectId`, `workspaceId`, `title`, optional `description`, `status`, `priority`, `assigneeId`, `dueDate`, `completedAt`, `attachments`, `createdBy`, `deletedAt`, `createdAt`, `updatedAt`. Defaults: `todo`, `medium`, null assignee/date/completion/deletion, empty attachments. `completedAt` is managed by server status transitions; client input is discarded. Assignees must be active project members. Attachment object has `_id`, `key`, `fileName`, `mimeType`, `size`, and signed `url`.

### `GET /task`

Lists non-deleted tasks across caller's projects in the selected workspace, newest first. Optional strict query parameters: `projectId` (ObjectId), `assigneeId` (ObjectId or literal `me`), `status` (`todo|in_progress|in_review|done`). Returns `{ "success": true, "data": [...] }`.

### `GET /task/project/:projectId`

Any project member. Lists non-deleted project tasks, newest first, with signed attachment URLs. Invalid ID: `400`; nonmember/absent project: `404`.

### `POST /task/project/:projectId`

Project `admin` or `editor`. Multipart form (or no-file body accepted by Multer) with strict fields: `title` required (trimmed, 2–120 chars), optional `description` (trimmed, max 1,000), `status` (`todo|in_progress|in_review|done`), `priority` (`low|medium|high`), `assigneeId` (ObjectId, empty string or `null` to unassign), `dueDate` (date or null), and optional `files`. `completedAt` is accepted but discarded. Returns `201` `{ success, message: "Task created successfully", data: <task> }`.

### `GET /task/:taskId`

Any project member. Returns `{ "success": true, "data": <task> }` with signed attachment URLs. Invalid ID: `400`; missing task/nonmember: `404`.

### `PATCH /task/:taskId`

Project `admin`/`editor`, or assigned user with status-only changes. Accepts JSON or multipart form; supported optional fields are the same as task creation. At least one valid field or one file is required. `files` appends attachments. Returns `200` `{ success, message: "Task updated successfully", data: <task> }`. Assignee attempting other fields/files: `403`; invalid/empty body: `400`.

### `POST /task/:taskId/attachments`

Project `admin`/`editor` or assigned user. Multipart `files` required (1–5 files). Returns `201` with updated task and signed URLs. No files: `400`.

### `DELETE /task/:taskId/attachments/:attachmentId`

Project `admin`/`editor` or assigned user. Deletes stored object and attachment metadata. Returns `200` with updated task. Invalid IDs: `400`; task or attachment absent: `404`.

### `DELETE /task/:taskId`

Project `admin`/`editor`. Soft-deletes the task and deletes its attachment objects. Returns `200` `{ "success": true, "message": "Task deleted successfully" }`.

## Comments

Comments are nested under tasks for listing/creation and addressed by comment ID for editing/deletion. All comment routes require authentication and project membership through task/comment access checks.

### `GET /task/:taskId/comments`

Any project member. Returns non-deleted comments oldest first, with `authorId` populated with author name/avatar. Invalid task ID: `400`; missing task or nonmember: `404`.

### `POST /task/:taskId/comments`

Project `admin`, `editor`, or `commenter`; `viewer` cannot comment. Strict JSON body `{ "body": "string" }`, trimmed, 1–2,000 chars. Returns `201` `{ "success": true, "data": <comment with populated author> }`.

### `PATCH /comment/:commentId`

Comment author only, and the author must still be a non-viewer project member. Same strict body as creation. Returns `200` updated comment. Invalid ID/body: `400`; missing comment/nonmember: `404`; forbidden: `403`.

### `DELETE /comment/:commentId`

Comment author or project `admin`; author must still be a non-viewer member. Soft-deletes the comment. Returns `200` `{ "success": true, "message": "Comment deleted successfully" }`.

## Dashboard

### `GET /dashboard/summary`

Requires auth and `x-workspace-id`, but the current dashboard controller/repository calls are inconsistent with repository signatures and available methods. Intended response shape is `{ success, data: { counts: { projects, tasks, completed, overdue }, statusBreakdown, myTasks, recentProjects } }`; do not rely on this endpoint until implementation caveats are resolved.

## Implementation caveats

The checked-in source is not internally consistent enough for every documented route to run successfully. In particular:

- `src/repositories/task.repository.ts` exports `TaskModelRepository` and `createTaskModel`/`listTaskModels` methods, while controllers and services import `taskRepository` and call `createTask`, `listTasks`, `getTask`, etc. The imported symbol/methods are absent, so task controllers cannot operate as written.
- `src/controllers/task.controller.ts` also uses `projectRepository` without importing it.
- `src/repositories/project.repository.ts` calls several task repository methods/signatures that do not exist in the current task repository; dashboard calls project/task methods with mismatched signatures as well. The dashboard is therefore not reliably executable.
- `POST /auth/sync` currently does not accept pending invitations even though the invitation repository contains an unused acceptance method.
- Workspace owner/member roles are separate from project roles. Workspace membership alone does not add a person to projects; project membership controls visibility and permissions.

These caveats describe source-level incompatibilities, not guaranteed runtime status codes; a TypeScript build or route request may fail before reaching the documented handler logic.

## Filtering and pagination

`GET /task` is the only documented list endpoint with filters. No list route defines pagination parameters. Project and task lists sort newest first unless specifically noted above; comments sort oldest first.
