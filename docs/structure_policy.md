# Project Structure Policy

This document describes where new code belongs in Task Desk and the boundaries each layer should keep. Follow the existing organization when adding features; change the structure only when a clear need spans multiple modules.

## Directory map

| Path | Responsibility |
| --- | --- |
| `src/app.ts` | Express middleware and API route setup |
| `src/server.ts` | Database connection, HTTP startup, and graceful shutdown |
| `src/routes/` | HTTP paths, middleware ordering, and controller wiring |
| `src/controllers/` | Translate HTTP requests into application calls and responses |
| `src/services/` | Cross-resource workflows and integrations such as email or file storage |
| `src/repositories/` | Prisma persistence and database queries |
| `src/models/` | Prisma model type exports and shared domain enums |
| `src/interfaces/` | TypeScript domain and persistence-facing interfaces |
| `src/validators/` | Zod request schemas and input constraints |
| `src/middlewares/` | Authentication, access checks, validation, uploads, and error handling |
| `src/config/` | Database, Firebase, and object-storage client setup |
| `src/types/` | Type declarations that augment third-party types |
| `src/utils/` | Small reusable helpers and application error types |
| `docs/` | Project context and contributor-facing structure guidance |
| `postman/` | Postman collections for exercising API flows |

## Dependency and responsibility rules

- Keep HTTP-specific details in routes and controllers. Routes define the endpoint and middleware order; controllers handle request/response shaping.
- Keep database queries and persistence mutations in repositories. Do not put Prisma query logic in route files or duplicate it across controllers.
- Put multi-step workflows and external integrations in services. Services may coordinate repositories and infrastructure clients; keep them independent of Express request and response objects.
- Define input constraints in validators and attach them through the shared validation middleware. Do not rely only on TypeScript types to validate untrusted HTTP input.
- Put authentication and authorization checks in reusable middleware where the existing flow supports them. Apply access checks before protected controller actions.
- Keep the database schema in `prisma/schema.prisma`, shared Prisma model type exports and domain enums in `models/`, and request/domain interfaces in `interfaces/`. Reuse shared types rather than redefining role or status strings.
- Put environment-backed client setup in `config/`. Do not hard-code credentials or commit `.env` values.
- Keep utilities small and broadly reusable. Feature-specific behavior belongs with that feature's controller, service, repository, validator, or model.

## Naming and implementation conventions

- Use TypeScript for application code and preserve the strict compiler settings in `tsconfig.json`.
- Follow the established filename suffixes and naming patterns in the relevant directory (for example, `*.routes.ts`, `*.controller.ts`, `*.repository.ts`, `*.service.ts`, and `*.validator.ts`).
- Keep each module focused on one layer or cohesive feature responsibility. Avoid adding catch-all folders or files that mix unrelated concerns.
- Prefer the existing `asyncHandler`, `AppError`, validation middleware, and shared error handler patterns for asynchronous errors and API failures.
- Keep route registration centralized in `src/routes/index.ts`; the API is mounted beneath `/api/v1` in `src/app.ts`.
- When endpoint paths, payloads, authorization, or response behavior change, update the root `API.md` so it remains the API contract reference.

## Build and runtime boundaries

- `npm run dev` runs `src/server.ts` through `tsx watch`.
- `npm run build` compiles the `src/` tree into `dist/`; `rootDir` is `src` and `outDir` is `dist`.
- Keep application source under `src/` so it is included in the TypeScript build. Documentation and Postman collections remain outside the compiled source tree.
- Keep generated output, dependencies, and secrets out of source control (`dist/`, `node_modules/`, and `.env` are ignored).
