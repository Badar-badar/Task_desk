# Task Desk API Reference

## Base URL and conventions

All application routes are mounted under `/api/v1`. For example, with the server running locally, the health endpoint is `http://localhost:<PORT>/api/v1/health`; the port is taken from the `PORT` environment variable.

Protected endpoints require `Authorization: Bearer <Firebase ID token>`. `authenticate` verifies the Firebase token, loads the corresponding active local user, and returns `401` if the token is missing/invalid or the user is not registered, and `403` if the user is deactivated. Organization-scoped routes also require an active organization context. Role requirements below refer to the user's organization role: `owner`, `admin`, or `employee`.

Unless stated otherwise, request bodies are JSON. IDs are MongoDB ObjectId strings. Dates are accepted as values coercible to a JavaScript date (normally ISO 8601 strings); returned dates are serialized as ISO strings.

The server allows the frontend origin configured in `CLIENT_URL` and accepts the `Authorization` request header for CORS.

### Error response format

Errors passed through the application's error handler have this JSON shape:

```json
{
  "success": false,
  "message": "Error message",
  "stack": "Error stack (included unless NODE_ENV is exactly `production`)"
}
```

The handler does not include the internal `AppError.code` in its JSON response. `stack` is included unless `NODE_ENV` is exactly `production`. Common middleware errors include:

| HTTP status | Message |
| --- | --- |
| 400 | Validation message; malformed request; or Multer `Unexpected field` for the wrong upload field or more than 5 files |
| 401 | `Missing or invalid Authorization header`, `Missing token`, `Invalid or expired token`, or `Call /api/v1/auth/sync first` |
| 403 | `User is deactivated. Please request activation`, `Create or join an organization first`, or `You do not have permission to do this` |
| 404 | `Organization not found` |
| 413 | `File too large` (Multer file size limit) |
| 415 | `Only JPEG, PNG, WebP, and PDF files are allowed` |
| 500 | `Internal server Error` |

Validation errors from organization and auth validators use the same error envelope, with a Zod-generated message. The project/task `validate` middleware uses `API_ERROR` internally and formats messages as `body.<field>: <reason>` or `params.<field>: <reason>`. The error code is not returned in either case.

## Health

### `GET /health`

- **Authentication/role:** None.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "status": "ok",
    "app": "Task Desk",
    "db": "connected"
  }
  ```

  `db` is either `"connected"` or `"disconnected"`.
- **Errors:** No route-specific errors. This handler returns its health object directly.

## Authentication and current user

### `POST /auth/sync`

Register or sync the Firebase-authenticated user. Existing records keep their original name/email; the request's optional name is applied only when creating a user. A successful call updates `lastLogin`.

- **Authentication/role:** Valid Firebase bearer token (`verifyToken`); a local user record is not required.
- **Body (`application/json`):**

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `name` | string | No | Trimmed; 1–100 characters when provided |

  No additional body fields are accepted.
- **Query/URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "user": {
      "_id": "ObjectId",
      "firebaseUid": "string",
      "name": "string",
      "email": "string",
      "organizationId": "ObjectId or null",
      "role": "owner | admin | employee | null",
      "isActive": true,
      "lastLogin": "ISO date",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  }
  ```

  `lastLogin` may be present on a synced user; the returned value reflects the update. `organizationId` and `role` are null until the user belongs to an organization.
- **Errors:** `400` for invalid body or a Firebase account without an email (`Firebase account has no email`); `401` for missing/invalid/expired bearer token; `500` for unexpected failures. Uses the shared error envelope.

### `GET /auth/me`

- **Authentication/role:** `authenticate` (valid Firebase token and active, already-synced local user); no organization role required.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "user": {
      "_id": "ObjectId",
      "firebaseUid": "string",
      "name": "string",
      "email": "string",
      "organizationId": "ObjectId or null",
      "role": "owner | admin | employee | null",
      "isActive": true,
      "lastLogin": "ISO date (optional)",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  }
  ```

  `user` is the loaded Mongoose user document, including its schema fields and timestamps.
- **Errors:** `401` for missing/invalid/expired token or a user not registered; `403` for a deactivated user; `500` for unexpected failures. Uses the shared error envelope.

## Organizations and members

All organization endpoints require `authenticate`. Creating an organization is the exception to organization context: it is available to an authenticated user who is not already in an organization. All other organization endpoints require a current, non-deleted organization (`orgContext`).

### `POST /organization`

- **Authentication/role:** Authenticated user with no current organization; no organization role is required.
- **Body (`application/json`):**

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `name` | string | Yes | Trimmed; 2–120 characters |
  | `description` | string | No | Trimmed; up to 500 characters |

  No additional body fields are accepted.
- **Query/URL params:** None.
- **Success (`201`):**

  ```json
  {
    "success": true,
    "data": {
      "_id": "ObjectId",
      "name": "string",
      "slug": "string",
      "description": "string (optional)",
      "ownerId": "ObjectId",
      "deletedAt": null,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  }
  ```

  `slug` is generated from the name with a unique suffix. The user becomes the organization owner.
- **Errors:** `400` for invalid body; `409` with `You already belong to an organization` if the user already belongs to one; `500` for unexpected failures. Uses the shared error envelope.

### `GET /organization`

- **Authentication/role:** Authenticated user with an organization; any organization role.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "data": {
      "organization": {
        "_id": "ObjectId",
        "name": "string",
        "slug": "string",
        "description": "string (optional)",
        "ownerId": "ObjectId",
        "deletedAt": null,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      },
      "role": "owner | admin | employee"
    }
  }
  ```

- **Errors:** `403` if the user has no organization; `404` if the organization is missing or deleted; `500` for unexpected failures. Uses the shared error envelope.

### `PATCH /organization`

- **Authentication/role:** Authenticated organization member; `owner` or `admin`.
- **Body (`application/json`):** At least one field is required; no additional fields are accepted.

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `name` | string | No | Trimmed; 2–120 characters |
  | `description` | string | No | Trimmed; up to 500 characters |

- **Query/URL params:** None.
- **Success (`200`):** `{ "success": true, "data": <organization object> }`. The organization object has `_id`, `name`, `slug`, optional `description`, `ownerId`, `deletedAt`, `createdAt`, and `updatedAt`.
- **Errors:** `400` for invalid/empty update body; `403` for insufficient role or missing organization context; `404` with `Organization not found`; `500` for unexpected failures. Uses the shared error envelope.

### `DELETE /organization`

- **Authentication/role:** Authenticated organization member; `owner` only.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "message": "Organization deleted successfully"
  }
  ```

  Deletion is soft: the organization gets a `deletedAt` timestamp and its users are detached from it.
- **Errors:** `403` for insufficient role or missing organization context; `404` with `Organization not found`; `500` for unexpected failures. Uses the shared error envelope.

### `GET /organization/members`

- **Authentication/role:** Any authenticated organization member.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "ObjectId",
        "name": "string",
        "email": "string",
        "avatarUrl": "string (optional)",
        "role": "owner | admin | employee",
        "createdAt": "ISO date"
      }
    ]
  }
  ```

  `avatarUrl` is only present if the user record has one.
- Removing a member clears that user's task assignments in the organization.
- **Errors:** `403` for missing organization context; `404` if organization context cannot be loaded; `500` for unexpected failures. Uses the shared error envelope.

### `POST /organization/members`

- **Authentication/role:** Authenticated organization member; `owner` or `admin`.
- **Body (`application/json`):**

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `email` | string | Yes | Trimmed, lowercased, valid email |
  | `role` | `"admin" \| "employee"` | No | Defaults to `"employee"` |

  No additional body fields are accepted.
- **Query/URL params:** None.
- **Success (`201`):** `{ "success": true, "data": <member object> }`, where the member object has `_id`, `name`, `email`, optional `avatarUrl`, `role`, and `createdAt`.
- **Errors:** `400` for invalid body; `403` for insufficient role or missing organization context; `404` with `User must sign up before joining an organization` if the email has no registered user; `409` with `This user already belongs to an organization` if the user is already assigned; `500` for unexpected failures. Uses the shared error envelope.

### `PATCH /organization/members/:userId`

- **Authentication/role:** Authenticated organization member; `owner` or `admin`. Admins cannot manage admin roles; only the owner can change a member to/from `admin`.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `userId` | MongoDB ObjectId string | Yes |

- **Body (`application/json`):**

  | Field | Type | Required |
  | --- | --- | --- |
  | `role` | `"admin" \| "employee"` | Yes |

  No additional body fields are accepted.
- **Query params:** None.
- **Success (`200`):** `{ "success": true, "data": <member object> }`, where the member object has `_id`, `name`, `email`, optional `avatarUrl`, `role`, and `createdAt`.
- **Errors:** `400` for invalid ID/body; `403` with `You do not have permission to do this`, `Owner role cannot be changed`, or `Only the owner can manage admins`; `404` with `Member not found`; `500` for unexpected failures. Uses the shared error envelope.

### `DELETE /organization/members/:userId`

- **Authentication/role:** Authenticated organization member; `owner` or `admin`. Owners cannot be removed. Admins can remove themselves, but cannot remove another admin; only the owner can remove admins.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `userId` | MongoDB ObjectId string | Yes |

- **Body/query params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "message": "Member removed successfully"
  }
  ```

- **Errors:** `400` for invalid ID; `403` with `You do not have permission to do this`, `Organization owner cannot be removed`, or `Only the owner can remove admins`; `404` with `Member not found`; `500` for unexpected failures. Uses the shared error envelope.

## Projects

All project endpoints require `authenticate` and `orgContext`.

### `GET /project`

- **Authentication/role:** Any authenticated organization member.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "ObjectId",
        "organizationId": "ObjectId",
        "name": "string",
        "description": "string (optional)",
        "status": "active | on_hold | completed",
        "startDate": "ISO date (optional)",
        "endDate": "ISO date (optional)",
        "createdBy": "ObjectId",
        "createdAt": "ISO date",
        "updatedAt": "ISO date",
        "taskStats": { "total": 12, "done": 4 }
      }
    ]
  }
  ```

  Projects are ordered newest first by `createdAt`. `taskStats` counts non-deleted tasks.
- **Errors:** `403` for missing organization context; `404` if the organization cannot be loaded; `500` for unexpected failures. Uses the shared error envelope.

### `GET /project/:projectId`

- **Authentication/role:** Any authenticated organization member.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `projectId` | MongoDB ObjectId string | Yes |

- **Body/query params:** None.
- **Success (`200`):** `{ "success": true, "data": <project object> }`, with the same project fields and `taskStats` as listed for `GET /project`.
- **Errors:** `400` for invalid ID; `403` for missing organization context; `404` with `Project not found`; `500` for unexpected failures. Uses the shared error envelope.

### `POST /project`

- **Authentication/role:** `owner` or `admin`.
- **Body (`application/json`):**

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `name` | string | Yes | Trimmed; 2–150 characters |
  | `description` | string | No | Trimmed; up to 2,000 characters |
  | `status` | `"active" \| "on_hold" \| "completed"` | No | Defaults to `"active"` |
  | `startDate` | date-coercible value | No | Stored as a date |
  | `dueDate` | date-coercible value | No | Stored/returned as `endDate` |

  No additional body fields are accepted.
- **Query/URL params:** None.
- **Success (`201`):** `{ "success": true, "data": <project object> }`. The object includes `_id`, `organizationId`, `name`, optional `description`, `status`, optional `startDate` and `endDate`, `createdBy`, `createdAt`, and `updatedAt`.
- **Errors:** `400` for invalid body; `403` for insufficient role or missing organization context; `500` for unexpected failures. Uses the shared error envelope.

### `PATCH /project/:projectId`

- **Authentication/role:** `owner` or `admin`.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `projectId` | MongoDB ObjectId string | Yes |

- **Body (`application/json`):** At least one field is required; no additional fields are accepted.

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `name` | string | No | Trimmed; 2–150 characters |
  | `description` | string | No | Trimmed; up to 2,000 characters |
  | `status` | `"active" \| "on_hold" \| "completed"` | No | |
  | `startDate` | date-coercible value | No | |
  | `dueDate` | date-coercible value | No | Stored/returned as `endDate` |

- **Query params:** None.
- **Success (`200`):** `{ "success": true, "data": <updated project object> }`, with the project fields listed for `POST /project`.
- **Errors:** `400` for invalid ID/body; `403` for insufficient role or missing organization context; `404` with `Project not found`; `500` for unexpected failures. Uses the shared error envelope.

### `DELETE /project/:projectId`

- **Authentication/role:** `owner` or `admin`.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `projectId` | MongoDB ObjectId string | Yes |

- **Body/query params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "message": "Project deleted successfully"
  }
  ```

  The project is deleted from the database. Its non-deleted tasks are soft-deleted, and their attachment objects are removed from R2.
- **Errors:** `400` for invalid ID; `403` for insufficient role or missing organization context; `404` with `Project not found`; `500` for unexpected failures. Uses the shared error envelope.

## Tasks and attachments

All task endpoints require `authenticate` and `orgContext`. Task reads are available to any organization member. Task creation and task deletion require `owner` or `admin`. An employee may update only the `status` of a task assigned to them, and may upload or delete attachments only on their assigned tasks. Owners and admins retain full task-update and attachment access.

Task responses use the task document fields `_id`, `organizationId`, `projectId`, `title`, optional `description`, `status`, `priority`, `assigneeId`, `dueDate`, `completedAt`, `attachments`, `createdBy`, `deletedAt`, `createdAt`, and `updatedAt`. The model defaults `status` to `"todo"`, `priority` to `"medium"`, `assigneeId`, `dueDate`, `completedAt`, and `deletedAt` to `null`, and `attachments` to `[]`. `completedAt` is server-managed: it is set when status changes to `"done"` and cleared when status changes away from `"done"`; any client-provided value is ignored.

Each attachment is returned with its stored metadata and a freshly generated signed URL:

```json
{
  "_id": "ObjectId",
  "key": "string",
  "fileName": "string",
  "mimeType": "string",
  "size": 123,
  "url": "signed URL"
}
```

The signed URL expires after 3,600 seconds (one hour). `key` is also included in the response.

File uploads use `multipart/form-data` and the Multer field name `files` (repeat this field for multiple files). All upload endpoints accept at most 5 files per request; each file is limited to 10 MiB (10 × 1024 × 1024 bytes). Allowed MIME types are `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`.

### `GET /task/project/:projectId`

- **Authentication/role:** Any authenticated organization member.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `projectId` | MongoDB ObjectId string | Yes |

- **Body/query params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "ObjectId",
        "organizationId": "ObjectId",
        "projectId": "ObjectId",
        "title": "string",
        "description": "string (optional)",
        "status": "todo | in_progress | in_review | done",
        "priority": "low | medium | high",
        "assigneeId": "ObjectId or null",
        "dueDate": "ISO date or null",
        "completedAt": "ISO date or null",
        "attachments": ["<attachment object including signed url>"],
        "createdBy": "ObjectId",
        "deletedAt": null,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ]
  }
  ```

  Tasks are ordered newest first by `createdAt`.
- **Errors:** `400` for invalid project ID; `403` for missing organization context; `404` with `Project not found`; `500` for unexpected failures. Uses the shared error envelope.

### `GET /task`

- **Authentication/role:** Any authenticated organization member.
- **Query params:** All optional; tasks are organization-scoped and soft-deleted tasks are excluded.

  | Param | Type | Description |
  | --- | --- | --- |
  | `projectId` | MongoDB ObjectId string | Filter by project |
  | `assigneeId` | MongoDB ObjectId string or `me` | Filter by assignee; `me` selects the current user |
  | `status` | `todo \| in_progress \| in_review \| done` | Filter by status |

- **Success (`200`):** `{ "success": true, "data": [<task objects with signed attachment URLs>] }`. Results are ordered newest first by `createdAt`.
- **Errors:** `400` for invalid query parameters; `403` for missing organization context; `500` for unexpected failures. Uses the shared error envelope.

### `POST /task/project/:projectId`

- **Authentication/role:** `owner` or `admin`.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `projectId` | MongoDB ObjectId string | Yes |

- **Body:** `multipart/form-data`. Text fields:

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `title` | string | Yes | Trimmed; 2–120 characters |
  | `description` | string | No | Trimmed; up to 1,000 characters |
  | `status` | `"todo" \| "in_progress" \| "in_review" \| "done"` | No | Defaults to `"todo"` |
  | `priority` | `"low" \| "medium" \| "high"` | No | Defaults to `"medium"` |
  | `assigneeId` | ObjectId string or `null` | No | Must identify an active user in this organization |
  | `dueDate` | date-coercible value | No | |
  | `completedAt` | Any value | No | Ignored; this field is managed by the server |
  | `files` | file(s) | No | Multer upload field; up to 5 files, limits above |

  Text fields are validated as a strict body, so other fields are rejected. For multipart requests, an empty `assigneeId` or the literal `"null"` unassigns the task.
- **Query params:** None.
- **Success (`201`):**

  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": "<task object with attachments and signed urls>"
  }
  ```

  If files were not provided, `attachments` is an empty array.
- **Errors:** `400` for invalid ID/body, an assignee who is not an active organization member (`Assignee must be a member of this organization`), or Multer file-count/field errors; `403` for insufficient role or missing organization context; `404` with `Project not found`; `413` if any file exceeds 10 MiB; `415` for unsupported MIME type; `500` for unexpected failures. Uses the shared error envelope.

### `GET /task/:taskId`

- **Authentication/role:** Any authenticated organization member.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `taskId` | MongoDB ObjectId string | Yes |

- **Body/query params:** None.
- **Success (`200`):** `{ "success": true, "data": <task object with attachment URLs> }`.
- **Errors:** `400` for invalid ID; `403` for missing organization context; `404` with `Task not found`; `500` for unexpected failures. Uses the shared error envelope.

### `PATCH /task/:taskId`

- **Authentication/role:** `owner` or `admin`, or the assigned employee (who may update only `status`).
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `taskId` | MongoDB ObjectId string | Yes |

- **Body:** `multipart/form-data` (also accepts JSON if no files are uploaded). Optional text fields:

  | Field | Type | Required | Constraints |
  | --- | --- | --- | --- |
  | `title` | string | No | Trimmed; 2–120 characters |
  | `description` | string | No | Trimmed; up to 1,000 characters |
  | `status` | `"todo" \| "in_progress" \| "in_review" \| "done"` | No | |
  | `priority` | `"low" \| "medium" \| "high"` | No | |
  | `assigneeId` | ObjectId string or `null` | No | Must identify an active user in this organization; empty string or `"null"` unassigns in multipart requests |
  | `dueDate` | date-coercible value | No | |
  | `completedAt` | Any value | No | Ignored; this field is managed by the server |
  | `files` | file(s) | No | Multer upload field; up to 5 files, limits above |

  Body fields are strict. At least one task field or one file must be provided.
- **Query params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "message": "Task updated successfully",
    "data": "<updated task object with attachment URLs>"
  }
  ```

- **Errors:** `400` for invalid ID/body, an empty update (`Provide fields to update or attach at least one file`), an invalid assignee, or Multer file-count/field errors; `403` if the caller lacks access or an assigned employee attempts to update fields other than `status`; `404` with `Task not found`; `413` if any file exceeds 10 MiB; `415` for unsupported MIME type; `500` for unexpected failures. Uses the shared error envelope.

### `POST /task/:taskId/attachments`

- **Authentication/role:** `owner` or `admin`, or the assigned employee.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `taskId` | MongoDB ObjectId string | Yes |

- **Body:** `multipart/form-data` with one or more `files` file fields (up to 5 files, subject to the upload limits above). At least one file is required.
- **Query params:** None.
- **Success (`201`):**

  ```json
  {
    "success": true,
    "message": "Task attachments uploaded successfully",
    "data": "<updated task object with attachment URLs>"
  }
  ```

- **Errors:** `400` for invalid ID, no files (`Select at least one file to upload`), or Multer file-count/field errors; `403` for callers other than the owner, admin, or assigned employee; `404` with `Task not found`; `413` if any file exceeds 10 MiB; `415` for unsupported MIME type; `500` for unexpected failures. Uses the shared error envelope.

### `DELETE /task/:taskId/attachments/:attachmentId`

- **Authentication/role:** `owner` or `admin`, or the assigned employee.
- **URL params:** Both `taskId` and `attachmentId` are MongoDB ObjectId strings.
- **Body/query params:** None.
- **Success (`200`):** `{ "success": true, "message": "Task attachment deleted successfully", "data": <updated task object with signed URLs> }`. The R2 object is deleted and the attachment subdocument is removed.
- **Errors:** `400` for invalid IDs; `403` for callers other than the owner, admin, or assigned employee; `404` for `Task not found` or `Attachment not found`; `500` for unexpected failures. Uses the shared error envelope.

### `DELETE /task/:taskId`

- **Authentication/role:** `owner` or `admin`.
- **URL params:**

  | Param | Type | Required |
  | --- | --- | --- |
  | `taskId` | MongoDB ObjectId string | Yes |

- **Body/query params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "message": "Task deleted successfully"
  }
  ```

  Deletion is soft: the task gets a `deletedAt` timestamp.
- The task's R2 attachment objects are also deleted.
- **Errors:** `400` for invalid ID; `403` for insufficient role or missing organization context; `404` with `Task not found`; `500` for unexpected failures. Uses the shared error envelope.

## Dashboard

### `GET /dashboard/summary`

- **Authentication/role:** Any authenticated organization member.
- **Body, query, URL params:** None.
- **Success (`200`):**

  ```json
  {
    "success": true,
    "data": {
      "counts": { "projects": 8, "tasks": 20, "completed": 7, "overdue": 2 },
      "statusBreakdown": { "todo": 4, "in_progress": 5, "in_review": 4, "done": 7 },
      "myTasks": [{ "projectName": "Project name" }],
      "recentProjects": [{ "taskStats": { "total": 5, "done": 2 } }]
    }
  }
  ```

  `myTasks` contains up to 6 tasks assigned to the current user, not in `done` status, ordered by due date ascending; each includes `projectName`. `recentProjects` contains the 4 newest projects and their non-deleted `taskStats`. For employees, task counts and the status breakdown include only tasks assigned to them.
- **Errors:** `403` for missing organization context; `500` for unexpected failures. Uses the shared error envelope.

## Filtering and sorting

- No endpoint implements pagination or accepts pagination query parameters.
- `GET /task` supports the filters documented above. Task lists are ordered newest first by `createdAt`; project lists are ordered newest first by `createdAt`.

