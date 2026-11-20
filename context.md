# Task Desk Project Context

## Overview

Task Desk is a REST API for managing workspaces, projects, tasks, and task attachments. It is a TypeScript application built with Express 5 and Mongoose, with Firebase Authentication for identity and an S3-compatible object store for file storage.

## Stack and commands

- Node.js, TypeScript (strict mode), Express 5
- MongoDB through Mongoose
- Firebase Admin verifies ID tokens; Firebase client SDK is also installed
- AWS SDK S3 client and presigner support object storage (configured for an S3-compatible service)
- Zod validates request payloads; Multer handles multipart uploads
- `npm run dev` starts `src/server.ts` with `tsx watch`
- `npm run build` compiles `src` into `dist`
- `npm start` is intended to run the compiled server; check its entry path if changing build/start behavior because `tsc` emits JavaScript

## Application layout

- `src/app.ts` configures Helmet, CORS, JSON parsing, API routes, and the shared error handler.
- `src/server.ts` connects to MongoDB, starts the HTTP server, and closes the server/database on shutdown signals.
- `src/routes/` defines the API surface. Routes are mounted below `/api/v1`; the health endpoint is `/api/v1/health`.
- `src/controllers/` handles HTTP requests and responses.
- `src/services/` contains file/storage operations.
- `src/repositories/` contains database access and persistence operations.
- `src/models/` defines Mongoose schemas; `src/interfaces/` contains domain interfaces and `src/models/enums.ts` shared enums.
- `src/middlewares/` includes authentication, workspace context, role-based access, validation, uploads, and error handling.
- `src/validators/` contains Zod schemas.
- `src/config/` initializes MongoDB, Firebase, and S3-compatible storage clients.
- `API.md` documents endpoints, payloads, authorization, and errors; `postman/` contains API tooling.

## Request and access flow

1. Requests enter through `src/app.ts` and `/api/v1` routes.
2. Protected routes use the Firebase bearer-token middleware. Firebase identity is mapped to a local `User` document; `POST /api/v1/auth/sync` creates/synchronizes that record.
3. Workspace-scoped routes load the user's current workspace. Role middleware enforces workspace permissions (`owner`, `admin`, or `employee`) where required.
4. Validators check input before controllers call repositories/services.
5. Errors are forwarded to the shared error handler and serialized in the envelope documented in `API.md`.

## Domain model

- A user is linked to Firebase by `firebaseUid` and may have an `workspaceId` and workspace role.
- a workspace has an owner and soft-delete state (`deletedAt`). workspace context is required for most workspace, project, and task operations.
- Projects and tasks belong to workspaces; task behavior and state values are described by their model/interface definitions and `API.md`.
- Task attachments are handled through the attachment/storage services and S3-compatible configuration.

## Configuration and conventions

Runtime configuration is read from environment variables (loaded with `dotenv`). See `src/config/` and the API documentation for which services need configuration. Do not commit `.env` values or credentials.

Keep HTTP concerns in controllers/routes, persistence in repositories, and cross-resource or storage behavior in services. Reuse middleware and validators for authorization and input checks. Preserve the existing TypeScript strictness and update `API.md` when endpoint behavior or payloads change.

## Useful references

- API contract: `API.md`
- Route mounting: `src/routes/index.ts`
- App setup: `src/app.ts`
- User sync example: `src/repositories/auth.repository.ts`
