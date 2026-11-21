# Task Desk API Reference

This reference documents the HTTP API implemented by the Express routes, validators, controllers, models, and repositories in `src/`. The API base path is `/api/v1`; endpoint paths below omit that prefix. MongoDB ObjectIds are represented as 24-character hexadecimal strings.

## Quick reference

| Area | Endpoints |
| --- | --- |
| Health/auth | `GET /health`, `POST /auth/sync`, `GET /auth/me` |
| Workspaces | `GET /workspace`, `POST /workspace`, `GET/PATCH/DELETE /workspace/:workspaceId` |
| Workspace members | `GET/POST /workspace/:workspaceId/members`, `DELETE /workspace/:workspaceId/members/:userId` |
| Projects | `GET/POST /project`, `GET/PATCH/DELETE /project/:projectId` |
| Project members/invitations | `GET/POST /project/:projectId/members`, `PATCH/DELETE /project/:projectId/members/:userId`, `GET/PATCH/DELETE /project/:projectId/invitations` |
| Favorites | `GET /favorite`, `POST /project/:projectId/favorite` |
| Tasks/attachments | `GET /task`, `GET/POST /task/project/:projectId`, `GET/PATCH/DELETE /task/:taskId`, task attachment endpoints below |
| Comments | `GET/POST /task/:taskId/comments`, `PATCH/DELETE /comment/:commentId` |
| Dashboard | `GET /dashboard/summary` |

## Conventions

- The server listens on `PORT`; health is `GET /api/v1/health`.
- Protected routes use `Authorization: Bearer <Firebase ID token>`. `authenticate` verifies the Firebase token, loads the local user, and requires `isActive`. Call `POST /auth/sync` before other protected routes for a new user.
- Project and task routes also require `x-workspace-id: <workspace ObjectId>`. The user must be a member of that active workspace. `/workspace/:workspaceId/...` routes take the workspace ID in the path.
- Project role is one of `admin`, `editor`, `commenter`, or `viewer`. Workspace role is `owner` or `member`. Task access generally follows the project role; the assigned user is additionally allowed to update only task status and to manage task attachments.
- JSON is expected unless an endpoint says `multipart/form-data`. IDs are MongoDB ObjectId strings. Date fields are coerced to JavaScript dates, normally supplied as ISO 8601 strings.
- Request schemas marked strict reject unknown JSON/form fields. Optional fields omitted from an update are left unchanged; use `null` only where the endpoint explicitly accepts it to clear a field.
- Uploads use multipart field `files`, up to 5 files per request and 10 MiB per file. Accepted MIME types: JPEG, PNG, WebP, PDF. Attachment responses include metadata plus a signed `url` expiring after one hour.
- Project invitations are emailed through Resend. Configure `RESEND_API_KEY`, `MAIL_FROM`, and `CLIENT_URL`; the recipient joins by signing up with the invited email address.

### Roles and access

Workspace membership and project membership are separate. Being in a workspace does not grant access to every project in it.

| Role | Access |
| --- | --- |
| Workspace `owner` | Update/delete the workspace; add/remove workspace members; has project access only where separately added as a project member |
| Workspace `member` | Read workspace and members; leave the workspace; must be added to projects separately |
| Project `admin` | Read project data; manage project, project members, and invitations; toggle their own favorite; create/update/delete tasks; read/comment on tasks |
| Project `editor` | Read project data; create/update/delete tasks; manage task attachments; read/comment on tasks |
| Project `commenter` | Read project data and tasks; create comments |
| Project `viewer` | Read project data and tasks |

A task assignee can update that task's status and add/remove its attachments even if their project role is `commenter` or `viewer`. Assignment does not grant permission to edit other task fields or delete the task. A comment author can edit/delete their own comment while still a non-viewer project member; a project admin can also delete comments.

### Environment configuration

The server reads configuration from `.env` (never commit secret values):

| Variable | Used for |
| --- | --- |
| `PORT` | HTTP listen port |
| `MONGO_URI` | MongoDB connection |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin token verification; private-key `\\n` sequences are converted to newlines |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare R2 task attachment storage |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend invitation email delivery |
| `CLIENT_URL` | CORS origin and invitation email button destination; required when sending an invitation email |
| `NODE_ENV` | Controls whether error responses include a stack (omitted only when exactly `production`) |

Errors handled by the shared error middleware have shape `{ "success": false, "message": "...", "stack": "..." }`; `stack` is omitted only when `NODE_ENV` is exactly `production`. The internal `AppError.code` is not returned. Validation errors use `400`; authentication failures use `401`; authorization failures use `403`; inaccessible or absent resources generally use `404`; conflicts use `409`. Multer file-size failures are `413`, wrong upload field/count is `400`, unsupported file types are `415`. Unhandled exceptions return `500` with message `Internal server Error`. Express's default response is used for unmatched paths because the custom `notFound` handler is not mounted.

## Health and authentication

### `GET /health`

No auth. Returns `200` `{ "status": "ok", "app": "Task Desk", "db": "connected" }`; `db` is `connected` or `disconnected`.

### `POST /auth/sync`

Requires a valid Firebase bearer token; does not require an existing local user. Optional strict JSON body: `{ "name": "string" }` (trimmed, 1–100 chars). Creates a local user if needed and updates `lastLogin`; the supplied name is used only on first creation. Applies pending project invitations matching the account email and creates project memberships using each invitation's role.

Returns `200` `{ "success": true, "user": <user document> }`. User fields include `_id`, `firebaseUid`, `name`, `email`, `isActive`, optional `lastLogin`, `workspaceId`, `role`, and timestamps. Errors: `400` invalid body or Firebase account without email; `401` invalid/missing token; `500` unexpected error.

### `GET /auth/me`

Requires an active, synced Firebase user; no workspace required. Returns `200` `{ "success": true, "user": <user document> }`. Errors: `401` missing/invalid token or local user; `403` deactivated user.

## Workspaces

### `POST /workspace`

Authenticated user. Strict JSON body `{ "name": "string" }`, trimmed, 2–120 chars. Creates a workspace and owner membership. Returns `201` `{ "success": true, "data": <workspace with role: "owner"> }`.

### `GET /workspace`

Lists the caller's non-deleted workspaces, ordered by membership creation time. Returns `200` `{ "success": true, "data": [<workspace fields plus role>] }`. Workspace fields include `_id`, `name`, generated unique `slug`, `ownerId`, timestamps, and `deletedAt`.

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

Project `admin` only. Strict body `{ "email": "valid email", "role": "admin|commenter|editor|viewer" }`; role defaults to `editor`. Existing active user is added immediately (`201`, `{ success, invited: false, data: member }`). If no active account exists for that email, creates/updates a pending invitation and emails that address (`201`, `{ success, invited: true, message, data: invitation }`). The recipient joins after signing up with the same email. Email delivery/configuration failure returns `502`; the pending invitation remains saved, and retrying sends the email again. Duplicate member: `409`.

### `PATCH /project/:projectId/members/:userId`

Project `admin` only. Strict body `{ "role": "admin|commenter|editor|viewer" }`. Returns updated member. Invalid ID/body: `400`; missing member: `404`; demoting the last admin: `400` (`A project must have at least one admin. Make someone else admin first`).

### `DELETE /project/:projectId/members/:userId`

Any member may remove themselves to leave; an `admin` may remove another member. Removes favorite and clears that member's task assignments. Returns `200` with `You left the project` or `Member removed successfully`. Removing the last admin returns `400`; forbidden: `403`; missing member: `404`.

### `GET /project/:projectId/invitations`

Project `admin` only. Lists pending invitations newest first, with `invitedBy` populated with name/email. Returns `{ success, data: [...] }`.

### `PATCH /project/:projectId/invitations/:invitationId`

Project `admin` only. Strict body `{ "role": "admin|commenter|editor|viewer" }`. Updates role on a pending invitation and returns it in `data`; this endpoint does not send a new email. Invalid ID/body: `400`; absent/nonpending invitation: `404`.

### `DELETE /project/:projectId/invitations/:invitationId`

Project `admin` only. Changes a pending invitation status to `revoked`, returns updated invitation in `data`. Invalid ID: `400`; absent/nonpending invitation: `404`. Pending invitations are applied during `POST /auth/sync` when the Firebase account email matches; the email button opens `CLIENT_URL` and tells the invitee to sign up with that address. There is no separate tokenized accept endpoint.

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

Project `admin` or `editor`. Accepts JSON or multipart form with strict fields: `title` required (trimmed, 2–120 chars), optional `description` (trimmed, max 1,000), `status` (`todo|in_progress|in_review|done`), `priority` (`low|medium|high`), `assigneeId` (ObjectId, empty string or `null` to unassign), `dueDate` (date; JSON `null` clears it on update), and optional `files` (multipart only). `completedAt` is accepted but discarded. Returns `201` `{ success, message: "Task created successfully", data: <task> }`.

### `GET /task/:taskId`

Any project member. Returns `{ "success": true, "data": <task> }` with signed attachment URLs. Invalid ID: `400`; missing task/nonmember: `404`.

### `PATCH /task/:taskId`

Project `admin`/`editor`, or assigned user with status-only changes. Accepts JSON or multipart form; supported optional fields are the same as task creation. At least one valid field or one file is required. `files` appends attachments. Returns `200` `{ success, message: "Task updated successfully", data: <task> }`. Assignee attempting other fields/files: `403`; invalid/empty body: `400`.

### `POST /task/:taskId/attachments`

Project `admin`/`editor` or assigned user. Multipart `files` required (1-5 files). Returns `201` with updated task and signed URLs. No files: `400`.

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

Requires auth and `x-workspace-id`. Returns `{ "success": true, "data": { "counts", "statusBreakdown", "myTasks", "recentProjects" } }`.

- `counts`: `projects` visible to the caller in this workspace, `tasks` non-deleted workspace tasks, `completed` tasks with status `done`, and `overdue` non-done tasks with a past due date.
- `statusBreakdown`: counts of non-deleted workspace tasks by `todo`, `in_progress`, `in_review`, and `done`.
- `myTasks`: up to 6 non-done tasks assigned to the caller, ordered by due date then creation date. Includes a `projectName` and signed attachment URLs.
- `recentProjects`: up to 4 of the caller's projects in the workspace, newest first, with task stats.

## Filtering and pagination

`GET /task` is the only documented list endpoint with filters. No list route defines pagination parameters. Project and task lists sort newest first unless specifically noted above; comments sort oldest first.
