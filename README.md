# NestJS Service Template

A production-ready NestJS REST API template with batteries included:

- **TypeORM** + PostgreSQL with BaseRepository pattern
- **JWT authentication** via global AuthGuard
- **Role-based access control** (RBAC) with RolesGuard
- **Swagger** documentation with composite API decorators
- **Global exception filter** with consistent error responses
- **Validation** via class-validator (422 on invalid input)
- **Health check** endpoint via @nestjs/terminus
- **Vercel** deployment configuration
- **Flyway-style** SQL migrations
- **Kiro steering files** for AI-assisted development

---

## Quick Start

```bash
# 1. Clone this template
git clone <repo-url> my-service
cd my-service

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# 4. Start development
npm run start:dev
```

The API will be available at `http://localhost:8080/api/actuator` (health check).

Swagger UI (when `SWAGGER=true`): `http://localhost:8080/api/swagger`

---

## Project Structure

```
src/
├── main.ts                     # Bootstrap — port, CORS, cookie-parser, validation, Swagger
├── app.module.ts               # Root module — TypeORM, ConfigModule, guards, feature modules
├── app.controller.ts           # Health check endpoint (GET /api/actuator)
├── app.service.ts              # HealthCheckService wrapper (TypeORM DB ping)
├── auth/
│   ├── auth.guard.ts           # Global JWT guard — blocks all non-@Public routes
│   └── roles.guard.ts          # RolesGuard — RBAC, applied per-route with @Roles()
├── config/
│   ├── base.repository.ts      # Abstract BaseRepository — wraps TypeORM with optional EntityManager
│   └── swagger.config.ts       # Swagger DocumentBuilder setup
├── decorator/
│   ├── api.decorator.ts        # Composite Swagger helpers (@ApiController, @ApiAuth, etc.)
│   ├── public.decorator.ts     # @Public() — bypasses AuthGuard
│   └── roles.decorator.ts      # @Roles(...Role[]) — sets required roles metadata
├── enum/
│   └── role.enum.ts            # Role enum: SUPER_ADMIN | ADMIN | USER
├── filter/
│   ├── http-exception.filter.ts # Global exception filter + ErrorResponse interface
│   └── error-response.dto.ts   # ErrorResponseDto + pre-built Swagger error schemas
└── sample/                     # ← Example feature module (delete when starting your project)
    ├── sample.module.ts
    ├── sample.controller.ts
    ├── sample.service.ts
    ├── sample.entity.ts
    ├── sample.repository.ts
    ├── enum/
    │   └── sample-status.enum.ts
    └── dto/
        ├── create-sample.dto.ts
        └── sample-response.dto.ts

db-migrations/                  # Flyway-style SQL migrations (V1__, V2__, ...)
.kiro/steering/                 # AI development standards (services, repos, modules, etc.)
```

---

## Adding a New Feature

1. Create the feature folder: `src/<feature>/`
2. Add entity, repository, service, controller, module, DTOs following the sample module pattern
3. Register the module in `app.module.ts`
4. Add a migration in `db-migrations/V<N>__<Description>.sql`

See `.kiro/steering/` for detailed conventions on each layer.

---

## Authentication & Authorization

The global `AuthGuard` is registered in `AppModule` via `APP_GUARD`. Every route requires a valid JWT `Authorization: Bearer <token>` header unless decorated with `@Public()`.

For role-based access:
```typescript
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Get('admin-only')
adminRoute() { ... }
```

`SUPER_ADMIN` automatically passes all role checks.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server listen port | `8080` |
| `DOMAIN` | Allowed CORS origin | — |
| `CONTEXT_PATH` | Global API prefix | `api` |
| `APP_NAME` | Application name (used in Swagger) | `NestJS Service` |
| `DB_HOST` | PostgreSQL host | — |
| `DB_USERNAME` | PostgreSQL username | — |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | Database name | — |
| `DB_SCHEMA` | PostgreSQL schema | — |
| `DB_SSL` | Enable SSL (`true`/`false`) | `false` |
| `JWT_SECRET` | Secret for signing/verifying JWTs | — |
| `PRODUCTION` | Disables TypeORM sync when `true` | `false` |
| `SWAGGER` | Enables Swagger UI when `true` | `false` |

---

## Deployment (Vercel)

The project is configured for Vercel deployment via `@vercel/node`:

1. Build: `npm run build`
2. Deploy: The `vercel.json` routes all traffic to `dist/main.js`

CI/CD workflow template is included at `.github/workflows/dev.yaml`.

---

## Conventions

- **Import paths**: Use `src/` absolute-style imports (via `baseUrl: "./"` in `tsconfig.json`)
- **Repositories**: Always extend `BaseRepository<T>` — never inject `Repository<T>` directly
- **Error handling**: Services throw NestJS `HttpException` subclasses — never raw `Error`
- **Swagger**: Use composite decorators from `src/decorator/api.decorator.ts` — never stack raw `@Api*`
- **Migrations**: Flyway-style `V<N>__<Description>.sql` files in `db-migrations/`

See `.kiro/steering/` for complete standards documentation.
