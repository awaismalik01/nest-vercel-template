# NestJS Service Template

## Overview

This is a generic NestJS REST API template. It provides a production-ready skeleton with authentication, RBAC, database access, Swagger documentation, and Vercel deployment — all pre-configured.

Clone this repo, rename it, strip the `src/sample/` module, and start building your features.

---

## Repository Structure

```
src/
├── main.ts                     # Bootstrap — port, CORS, cookieParser, global prefix, Swagger
├── app.module.ts               # Root module — TypeORM, ConfigModule, guards, feature modules
├── app.controller.ts           # Health check endpoint (GET /api/actuator)
├── app.service.ts              # HealthCheckService wrapper (TypeORM ping via @nestjs/terminus)
├── auth/
│   ├── auth.guard.ts           # Global JWT guard — blocks all non-@Public routes
│   └── roles.guard.ts          # RolesGuard — RBAC check, applied per-route with @Roles()
├── config/
│   ├── base.repository.ts      # Abstract BaseRepository — wraps TypeORM with optional EntityManager
│   └── swagger.config.ts       # Swagger DocumentBuilder setup (extracted from main.ts)
├── decorator/
│   ├── api.decorator.ts        # Composite Swagger helpers (@ApiController, @ApiAuth, @ApiBodyPost, @ApiPublicPost, etc.)
│   ├── public.decorator.ts     # @Public() — bypasses AuthGuard
│   └── roles.decorator.ts      # @Roles(...Role[]) — sets required roles metadata
├── enum/
│   └── role.enum.ts            # Role enum: SUPER_ADMIN | ADMIN | USER
├── filter/
│   ├── http-exception.filter.ts # Global exception filter + ErrorResponse interface
│   └── error-response.dto.ts   # ErrorResponseDto class + pre-built Swagger error schemas
└── sample/                     # Example feature module — shows all conventions in action
    ├── sample.module.ts
    ├── sample.controller.ts
    ├── sample.service.ts
    ├── sample.entity.ts
    ├── sample.repository.ts
    ├── enum/
    │   └── sample-status.enum.ts
    ├── dto/
    │   ├── create-sample.dto.ts
    │   └── sample-response.dto.ts
    └── index.ts

db-migrations/
└── V1__Create_sample_table.sql  # Example migration
```

---

## Bootstrap (`main.ts`)

- **Global prefix**: Configurable via `CONTEXT_PATH` env var (default: `api`)
- **Global filter**: `HttpExceptionFilter` registered via `app.useGlobalFilters()`
- **Global pipes**: `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, 422 status
- **CORS**: origin from `DOMAIN` env var, `credentials: true`
- **Cookie parser**: enabled globally
- **Swagger**: conditional — enabled only when `SWAGGER` env var is `'true'`
- **Port**: `PORT` env var, fallback `8080`

---

## Global Auth Guard

`AuthGuard` is registered as `APP_GUARD` in `AppModule` — it applies to every route by default.

- Routes opt out with `@Public()` decorator (sets `IS_PUBLIC_KEY` metadata)
- Extracts token from `Authorization: Bearer <token>` header
- Verifies with `JwtService.verifyAsync()`, attaches decoded payload to `request['user']`
- `RolesGuard` is **not** globally registered — apply it per-controller/route alongside `@Roles()`
- `RolesGuard` grants automatic access to any user with the `SUPER_ADMIN` role

---

## Database

- **Engine**: PostgreSQL
- **ORM**: TypeORM with `autoLoadEntities: true`
- **Schema**: Configurable via `DB_SCHEMA` env var
- **Sync**: `synchronize: true` when `PRODUCTION !== 'true'` (dev only — use migrations in prod)
- **Migrations**: Flyway-style SQL files in `db-migrations/`, run manually or via CI

### `BaseRepository`

All repositories extend `BaseRepository<T>` (`src/config/base.repository.ts`). It wraps TypeORM and accepts an optional `EntityManager` parameter for transaction participation.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server listen port | `8080` |
| `DOMAIN` | Allowed CORS origin | — |
| `CONTEXT_PATH` | Global API prefix | `api` |
| `APP_NAME` | Application name (used in Swagger title) | `NestJS Service` |
| `DB_HOST` | PostgreSQL host | — |
| `DB_USERNAME` | PostgreSQL username | — |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | Database name | — |
| `DB_SCHEMA` | PostgreSQL schema | — |
| `DB_SSL` | `"true"` enables SSL with `rejectUnauthorized: false` | `false` |
| `JWT_SECRET` | Secret for signing/verifying JWTs | — |
| `PRODUCTION` | `"true"` disables TypeORM `synchronize` | `false` |
| `SWAGGER` | `"true"` enables Swagger UI at `/<prefix>/swagger` | `false` |

---

## Deployment (Vercel)

`vercel.json` at root: builds `dist/main.js` with `@vercel/node`, routes all traffic to it, and redirects `/` → `/api/actuator`. `git.deploymentEnabled: false` means deploys are triggered by CI, not Vercel's git integration.

### CI/CD Pipelines

Two GitHub Actions workflows handle deployment:

| Workflow | Trigger | Vercel target | Infisical env |
|----------|---------|---------------|---------------|
| `.github/workflows/dev.yaml` | Push to any branch except `main` | `preview` | `staging` |
| `.github/workflows/prod.yaml` | Push to `main` | `production` | `prod` |

Both workflows run three jobs in order:

1. **Build** — checkout, setup Node 24, install dependencies
2. **Database** — run Flyway migrations via `awaismalik01/github-actions/secure-flyway-migration@v1`
3. **Deploy** — deploy to Vercel via `awaismalik01/github-actions/nest-vercel-deploy@v1`

Secrets are fetched from Infisical using OIDC authentication. Required GitHub repository secrets:

| Secret | Purpose |
|--------|---------|
| `INFISICAL_MACHINE_ID` | OIDC identity ID for Infisical authentication |
| `INFISICAL_NEON_DB_FLYWAY_SLUG` | Infisical project slug for Neon DB migration secrets |
| `INFISICAL_NEON_SECRET_PATH` | Secret path within the Infisical project for DB credentials |
| `INFISICAL_PROJECT_SLUG` | Infisical project slug for app environment variables |
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VERCEL_ORG_ID` | Vercel organization/team ID |

---

## Adding a New Feature

1. Create `src/<feature>/` with entity, repository, service, controller, module, DTOs
2. Register entity in `TypeOrmModule.forFeature([...])` within the module
3. Import the module in `app.module.ts`
4. Add a migration in `db-migrations/V<N>__<Description>.sql`
5. If the feature needs JWT signing, import the module that provides `JwtModule`

Follow the `src/sample/` module as a reference for the full pattern.

---

## Key Conventions

- Use `@Public()` on any route that must be accessible without a JWT.
- Use `@Roles(Role.ADMIN)` + apply `RolesGuard` locally for role-restricted routes.
- Always use `BaseRepository` for new repositories; pass `manager` through for transactions.
- New modules follow the pattern: entity → repository → service → controller → module.
- Import paths use `src/` absolute-style imports (configured via `baseUrl: "./"` in `tsconfig.json`).
- Use composite API decorators from `src/decorator/api.decorator.ts` on all routes.

---

## Agent Workflow Rules

- **Never run build or compile commands** (`nest build`, `npm run build`, `tsc`, etc.). The user handles builds manually.
- **Never run the dev server** (`npm run start:dev`, etc.). The user starts it themselves.
- Focus on writing correct code — the user will verify compilation.
- When adding new features, follow the pattern in `src/sample/`.
