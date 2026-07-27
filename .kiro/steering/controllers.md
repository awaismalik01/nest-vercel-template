# Controller Standards

Applies to any NestJS REST API project.

## File & class naming

| Artifact | Convention | Example |
|----------|-----------|---------|
| File | `<feature>.controller.ts` | `user.controller.ts` |
| Class | `<Feature>Controller` | `UserController` |
| Location | `src/<feature>/` alongside the module | `src/user/user.controller.ts` |

---

## Composite API decorators

Raw `@Api*` decorators must not be stacked manually on individual routes. Every project must maintain a central `src/decorator/api.decorator.ts` file that composes them into named helpers. Use those helpers on all routes.

### Required class-level helpers

| Helper | Composes | When to use |
|--------|---------|-------------|
| `@ApiController('Tag')` | `@ApiTags` + `@ApiBearerAuth('JWT')` | Every JWT-protected controller |
| `@ApiPublicController('Tag')` | `@ApiTags` only | Controllers where every route is public (no auth) |

### Required method-level helpers

| Helper | Composes | When to use |
|--------|---------|-------------|
| `@ApiAuth({ ... })` | `@HttpCode(200)` + `@ApiOperation` + `@ApiOkResponse` + `@ApiUnauthorizedResponse` + `@ApiInternalServerErrorResponse` | Authenticated endpoint without a request body |
| `@ApiAuthWithNotFound({ ... })` | `@ApiAuth` + `@ApiNotFoundResponse` | Authenticated endpoint that may return 404 |
| `@ApiPublicPost({ ... })` | `@HttpCode(200)` + `@ApiOperation` + optional `@ApiBody` + `@ApiOkResponse` + `@ApiBadRequestResponse` + `@ApiInternalServerErrorResponse` | Unauthenticated POST — no lock icon in Swagger |
| `@ApiBodyPost({ ... })` | `@HttpCode(200)` + `@ApiOperation` + `@ApiBody` + `@ApiOkResponse` + `@ApiUnauthorizedResponse` + `@ApiBadRequestResponse` + `@ApiInternalServerErrorResponse` | Authenticated POST with a request body |

All method-level helpers automatically attach `@ApiInternalServerErrorResponse` using the pre-built schema from `src/filter/error-response.dto.ts`.

When a case is not covered by an existing helper, add a new one to `api.decorator.ts` — do not inline raw stacks in controllers.

### Apidocs files — keeping controllers thin

When a route has substantial documentation (long descriptions, named examples, complex response shapes), extract the Swagger configuration into a co-located `<feature>.apidocs.ts` file and export it as a typed options object. The controller passes this object to the composite decorator.

```
src/<feature>/
├── <feature>.controller.ts   ← route method uses @ApiBodyPost(processEventsDocs)
└── <feature>.apidocs.ts      ← exports const processEventsDocs: ApiBodyPostOptions = { ... }
```

```typescript
// events.apidocs.ts
import { EventDto } from './dto/event.dto';
import { EventStatusDto } from './dto/event-status.dto';
import { ApiBodyPostOptions } from 'src/decorator/api.decorator';

export const processEventsDocs: ApiBodyPostOptions = {
  summary: 'Process a batch of provisioning events',
  description: '...',
  bodyType: EventDto,
  bodyOptions: { isArray: true, description: '...', examples: { ... } },
  responseType: EventStatusDto,
  isArray: true,
  responseDescription: '...',
};

// events.controller.ts
@Post()
@ApiBodyPost(processEventsDocs)
public async create(@Body() eventDto: EventDto[]): Promise<EventStatusDto[]> { ... }
```

```typescript
// user.apidocs.ts
import { UserCred } from './dto/user-cred.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ApiAuthOptions, ApiPublicPostOptions } from 'src/decorator/api.decorator';

export const loginDocs: ApiPublicPostOptions = {
  summary: 'Authenticate a user and set the auth_token cookie',
  body: { type: UserCred },
  responseSchema: { ... },
};

export const getUserDocs: ApiAuthOptions = {
  summary: 'Get the profile of the currently authenticated user',
  type: UserResponseDto,
};

// user.controller.ts
@Public()
@Post('login')
@ApiPublicPost(loginDocs)
async login(...) { ... }
```

Rules for apidocs files:
- One exported constant per route, named after the action: `loginDocs`, `getUserDocs`, `processEventsDocs`.
- Type each constant with the matching options interface (`ApiAuthOptions`, `ApiPublicPostOptions`, `ApiBodyPostOptions`).
- Import only from `src/decorator/api.decorator` for option types — never raw `@nestjs/swagger` imports.
- Only create an apidocs file when documentation is non-trivial (examples, long descriptions). Simple routes keep their options object inline in the controller.

---

## Rules

1. **Every route uses a composite decorator** — never stack raw `@Api*` decorators manually on a route.
2. **Every route documents its success response** — use `type:` for DTO classes, `responseSchema:` for simple inline shapes.
3. **Declare all reachable error responses** — add `@ApiNotFoundResponse` when a 404 is possible. Auth, bad-request, and internal-error responses are handled by the composite helpers.
4. **`@Public()` routes must use `@ApiPublicPost`** — prevents a Swagger lock icon on unauthenticated routes.
5. **`@HttpCode` is owned by the composite helper** — do not add it separately.
6. **No business logic in controllers** — extract from request, delegate to service, return result.
7. **Return typed DTOs, not raw entities** — services produce DTO instances; controllers pass them through.
8. **Inject the feature service only** — never inject a `Repository<T>` directly into a controller.
9. **Logger per class** — `private logger = new Logger(FeatureController.name);` — log start/end of non-trivial operations.

---

## Auth and RBAC

Routes that skip JWT authentication:
- Decorate with `@Public()` (from `src/decorator/public.decorator`)
- Use `@ApiPublicPost` so no lock icon appears in Swagger

Routes requiring a specific role:
```typescript
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
```
`RolesGuard` is not globally registered — apply it per-route or per-controller.
