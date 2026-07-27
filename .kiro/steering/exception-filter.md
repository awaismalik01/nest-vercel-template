# Exception Filter Standards

Applies to any NestJS project.

---

## Global filter

Every project must have a single `HttpExceptionFilter` (`src/filter/http-exception.filter.ts`) registered globally in `main.ts`:

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

It runs on every unhandled exception before the response is sent. Do not register exception filters at the controller or route level unless you need specialised behaviour for a single endpoint — extend the global filter instead.

---

## Global ValidationPipe

Every project must register a global `ValidationPipe` in `main.ts` alongside the filter:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }),
);
```

- `whitelist: true` — strips properties that have no `class-validator` decorator on the DTO.
- `forbidNonWhitelisted: true` — rejects requests with unknown properties (returns 422 instead of silently stripping).
- `errorHttpStatusCode: 422` — validation failures return 422 Unprocessable Entity (not 400).

The `ValidationPipe` throws `UnprocessableEntityException` which is caught by the global `HttpExceptionFilter`. The filter extracts the `message` array (field-level errors) and logs it at `warn` level.

---

## Consistent error response shape

Every error response must use this exact shape:

```json
{
  "statusCode": 404,
  "error":      "Not Found",
  "message":    "Order '123' not found",
  "path":       "/auth/orders/123",
  "timestamp":  "2026-07-22T10:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | `number` | HTTP status code |
| `error` | `string` | Standard HTTP status phrase |
| `message` | `string \| string[]` | Human-readable reason. Array when `ValidationPipe` returns multiple field errors |
| `path` | `string` | Request URL that triggered the error |
| `timestamp` | `string` | ISO 8601 UTC timestamp |

---

## Exception → status code mapping

| Thrown exception | `statusCode` |
|-----------------|-------------|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `UnprocessableEntityException` | 422 |
| `InternalServerErrorException` | 500 |
| `NotImplementedException` | 501 |
| Any non-`HttpException` | 500 |

Unknown / non-HTTP errors always produce `500 Internal Server Error`. The real error and stack are logged but never sent to the client.

---

## Logging behaviour

| Status range | Logger level | Stack included |
|-------------|-------------|----------------|
| 4xx | `logger.warn` | No |
| 5xx | `logger.error` | Yes (full stack) |

Log format: `[METHOD] /path → statusCode StatusPhrase: "message"`

---

## Service layer contract

Services must only throw NestJS `HttpException` subclasses. Raw `Error` objects make the filter produce a generic 500 and hide the real message.

```typescript
// correct
throw new NotFoundException(`Order '${id}' not found`);
throw new BadRequestException(`SKU '${sku}' already exists`);
throw new InternalServerErrorException('Unexpected error in createOrder');

// wrong — always becomes 500 with a generic message
throw new Error('something went wrong');
```

See `services.md` for the full error-handling pattern inside service methods.

---

## `ErrorResponse` interface

The `ErrorResponse` interface is exported from the filter file. Import it wherever the error shape needs to be referenced (e.g. test assertions):

```typescript
import { ErrorResponse } from 'src/filter/http-exception.filter';
```

---

## Swagger error schemas

Pre-built Swagger response objects live in `src/filter/error-response.dto.ts`. Import them in composite API decorators to document error responses consistently:

```typescript
import {
  BadRequestResponse,
  UnauthorizedResponse,
  NotFoundResponse,
  InternalErrorResponse,
} from 'src/filter/error-response.dto';
```

| Export | Status | Usage |
|--------|--------|-------|
| `BadRequestResponse` | 400 | `@ApiBadRequestResponse(BadRequestResponse)` |
| `UnauthorizedResponse` | 401 | `@ApiUnauthorizedResponse(UnauthorizedResponse)` |
| `ForbiddenResponse` | 403 | `@ApiForbiddenResponse(ForbiddenResponse)` |
| `NotFoundResponse(msg?)` | 404 | `@ApiNotFoundResponse(NotFoundResponse('Resource not found'))` — accepts optional message |
| `InternalErrorResponse` | 500 | `@ApiInternalServerErrorResponse(InternalErrorResponse)` |

The `ErrorResponseDto` class in the same file provides the Swagger-annotated schema shape for documentation tooling.
