# DTO Standards

Applies to any NestJS project that uses `@nestjs/swagger`.

---

## Purpose & placement

DTOs are the contract between the HTTP layer and the rest of the application. They are plain classes — no TypeORM decorators, no database concerns.

| Kind | Purpose | Location |
|------|---------|----------|
| Request DTO | Shape of an inbound request body | `src/<feature>/dto/<feature>-<verb>.dto.ts` |
| Response DTO | Shape returned to callers | `src/<feature>/dto/<feature>-response.dto.ts` |
| Nested DTO | Reusable sub-shape embedded in other DTOs | `src/<feature>/dto/<name>.dto.ts` |

Never return raw TypeORM entities from a controller — always map to a response DTO.

---

## Swagger annotations

Every DTO property must have `@ApiProperty` or `@ApiPropertyOptional`.

---

## Validation (class-validator)

Every **request DTO** must have `class-validator` decorators on all properties. Validation is enforced globally via `ValidationPipe` in `main.ts` — invalid requests are rejected with `422 Unprocessable Entity` before reaching the controller.

### Required setup (already configured)

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // strips properties without decorators
    forbidNonWhitelisted: true,   // rejects requests with unknown properties (422)
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,  // 422 instead of 400
  }),
);
```

### Decorator rules

| Scenario | Decorators |
|----------|-----------|
| Required string | `@IsString()` + `@IsNotEmpty()` |
| Required email | `@IsEmail()` + `@IsNotEmpty()` |
| Required UUID | `@IsUUID()` + `@IsNotEmpty()` |
| Required enum | `@IsEnum(MyEnum)` + `@IsNotEmpty()` |
| Required object | `@IsObject()` + `@IsNotEmpty()` |
| Password (min length) | `@IsString()` + `@IsNotEmpty()` + `@MinLength(8)` |
| Optional field | `@IsOptional()` + other validators — skips validation when value is `undefined` |

### Example — request DTO with validation

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Username for the account', example: 'john.doe' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'Password (min 8 characters)', example: 'P@ssword1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'John' })
  @IsOptional()
  @IsString()
  displayName?: string;
}
```

### Key points

- **Response DTOs do not need validation decorators** — only request DTOs.
- `@IsOptional()` must precede other validators on optional fields; without it, `undefined` triggers validation errors.
- `forbidNonWhitelisted: true` means any property sent by the client that is not decorated on the DTO will cause a 422 error.
- Validation errors are caught by the global `HttpExceptionFilter` and logged at `warn` level (422).

---

## Swagger annotations (detail)

For public-facing or complex DTOs (request bodies, event payloads), provide full annotations with `description` and `example`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThingDto {
  @ApiProperty({
    description: 'Human-readable name for the thing',
    example: 'My Thing',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description',
    example: 'A longer explanation',
  })
  description?: string;
}
```

For simple response DTOs where the property name is self-explanatory, bare `@ApiProperty()` is acceptable:

```typescript
export class UserResponseDto {
  @ApiProperty()
  id!: number;
  @ApiProperty()
  username!: string;
  @ApiProperty()
  roles!: string[];
}
```

### Annotation rules

| Requirement | Rule |
|-------------|------|
| `description` | Required on request DTOs and complex payloads — one sentence, no trailing period |
| `example` | Required on request DTOs and complex payloads — realistic value |
| Enum property | Add `enum: EnumType` — do not list string values manually |
| Array property | Add `isArray: true` and `type` |
| Nullable property | Add `nullable: true` |
| Required field | `@ApiProperty` |
| Optional / conditional field | `@ApiPropertyOptional` |

```typescript
// enum
@ApiProperty({ enum: StatusEnum, example: StatusEnum.ACTIVE })
status!: StatusEnum;

// array
@ApiProperty({ type: String, isArray: true, example: ['ADMIN', 'USER'] })
roles!: string[];

// nullable
@ApiProperty({ type: String, nullable: true, example: null })
deletedAt!: string | null;

// object / JSON payload
@ApiProperty({
  description: 'Event-type-specific parameters',
  type: 'object',
  additionalProperties: true,
  example: { username: 'john.doe', role: 'ADMIN' },
})
payload!: Record<string, unknown>;
```

---

## ID fields

| Type | TS type | Annotation |
|------|---------|-----------|
| Auto-increment integer | `number` | `@ApiProperty({ example: 1 })` or bare `@ApiProperty()` |
| UUID | `string` | `@ApiProperty({ format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' })` |

---

## Enums

Always define enums with explicit string values — bare numeric enums serialize as `0`/`1` in JSON and the database:

```typescript
// correct
export enum OrderStatusEnum {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

// wrong — serializes as 0, 1, 2
export enum OrderStatusEnum {
  PENDING,
  CONFIRMED,
  CANCELLED,
}
```

Place enums in `src/<feature>/enum/<name>.enum.ts`. Never inline enum literals inside a DTO file.

---

## Naming

| Convention | Example |
|-----------|---------|
| Request body for POST/PUT | `CreateOrderDto`, `UpdateProductDto` |
| Login / credential body | `UserCred` |
| Response body | `UserResponseDto`, `OrderResponseDto` |
| Per-item status response | `EventStatusDto` |
| Enum file | `order-status.enum.ts` → `OrderStatusEnum` |

---

## What NOT to do

- Do not add TypeORM decorators (`@Column`, `@Entity`, etc.) to DTOs.
- Do not use `Partial<SomeEntity>` as a controller parameter or return type.
- Do not import from `node_modules/` paths — always use the package name: `@nestjs/swagger`.
- Do not omit `@ApiProperty` on any property — even bare `@ApiProperty()` is required for Swagger to detect it.
- Do not mark a required field as `@ApiPropertyOptional` just because it is conditionally used — use a separate DTO or document the condition in `description`.
