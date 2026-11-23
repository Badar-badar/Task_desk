# Task Desk Project Context

## Overview

Task Desk is a TypeScript REST API for collaborative workspaces, projects, tasks, comments, favorites, invitations, and task attachments. It uses Express 5, MongoDB through Mongoose, Firebase Authentication, Zod validation, and Cloudflare R2-compatible object storage via the AWS S3 SDK. Resend is used to deliver project invitation emails.

## Stack and commands

- Node.js and TypeScript with strict compiler checking
- Express 5 for HTTP routing and middleware
- MongoDB and Mongoose for persistence
- Firebase Admin for verifying bearer tokens and Firebase client packages are also installed
- Zod for request validation; Multer for multipart uploads
- AWS SDK S3 client and presigner for attachment storage
- Resend for invitation email delivery
- `npm run dev` starts `src/server.ts` with `tsx watch`.
- `npm run build` compiles TypeScript from `src/` into `dist/`.
- `npm start` is configured in `package.json` to run `dist/server.ts`; verify this path if changing the build or start scripts because TypeScript compilation emits JavaScript.

## Application layout

- `src/app.ts` configures Helmet, CORS, JSON parsing, API routes, and the shared error handler.
- `src/server.ts` connects to MongoDB, starts the HTTP server, and closes the server and database on shutdown signals.
- `src/routes/` defines the API surface. `src/routes/index.ts` mounts routes beneath `/api/v1` and defines `GET /api/v1/health`.
- `src/controllers/` handles HTTP requests and responses.
- `src/services/` contains cross-resource and integration behavior, including email, storage, and task attachments.
- `src/repositories/` contains database access and persistence operations.
- `src/models/` defines Mongoose schemas and shared enums; `src/interfaces/` contains TypeScript domain interfaces.
- `src/middlewares/` includes authentication, resource access, validation, uploads, and error handling.
- `src/validators/` contains Zod request schemas.
- `src/config/` initializes MongoDB, Firebase, and S3-compatible storage clients.
- `docs/` contains project context and structure guidance; root `API.md` documents endpoint behavior; `postman/` contains Postman collections.

## Request and access flow

1. Requests enter through `src/app.ts` and are routed under `/api/v1`.
2. Protected routes use Firebase bearer-token authentication. The middleware verifies the token and loads the local user; `POST /api/v1/auth/sync` creates or synchronizes that record.
3. Workspace- and project-scoped routes apply the relevant membership and role checks through middleware.
4. Validators check request input before controllers call repositories or services.
5. Errors flow to the shared error handler and are serialized according to the API behavior documented in `API.md`.

## Domain overview

- Users are linked to Firebase identities by `firebaseUid`.
- Workspaces have owners and members. Workspace membership is separate from project membership.
- Projects belong to workspaces and have members with project roles (`admin`, `editor`, `commenter`, or `viewer`).
- Projects use statuses `active`, `on_hold`, and `completed`; tasks use statuses `todo`, `in_progress`, `in_review`, and `done`, with `low`, `medium`, or `high` priority.
- Tasks belong to projects and may have assignees, comments, and file attachments. Attachment operations use the storage service and signed URLs.
- Project invitations are tracked by status and can be applied when an invited person synchronizes an account with the matching email.

## Configuration and references

Runtime configuration is read from environment variables. `API.md` lists the required variables and endpoint details. Do not commit `.env` values, Firebase credentials, storage credentials, or email-service secrets.

- API contract: `API.md`
- Structure and layer boundaries: `docs/structure_policy.md`
- Route mounting: `src/routes/index.ts`
- Express app setup: `src/app.ts`
- Runtime startup: `src/server.ts`
- Authentication and user sync: `src/middlewares/auth.ts` and `src/repositories/auth.repository.ts`
