# Module Standards

Applies to any NestJS project.

---

## Feature folder structure

Every feature follows this layout:

```
src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.entity.ts          # or entities/<name>.entity.ts
├── <feature>.repository.ts
├── <feature>.apidocs.ts         # optional — only when Swagger docs are non-trivial
├── dto/
│   ├── <feature>-<verb>.dto.ts   # request DTOs
│   └── <feature>-response.dto.ts # response DTOs
└── enum/                         # optional
    └── <name>.enum.ts
```

---

## Module class

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([MyEntity]),  // register entities used by this feature's repositories
    OtherFeatureModule,                    // import when this feature depends on another service
  ],
  controllers: [MyController],
  providers:   [MyService, MyRepository],
  exports:     [MyService],               // export the service — never the repository
})
export class MyModule {}
```

---

## Rules

1. **Register entities** — every entity used by a repository in this module must be listed in `TypeOrmModule.forFeature([...])`.
2. **Export services, not repositories** — other modules depend on service APIs, not data-access internals.
3. **Import, don't re-implement** — if another module exports a service you need, import that module and use its export. Never duplicate logic.
4. **`JwtModule` is registered in `AppModule`** with `registerAsync`. Feature modules that need JWT signing or verification can inject `JwtService` directly (it's globally available via AppModule). Do not register `JwtModule` in feature modules.
5. **`forwardRef`** — use only to resolve genuine circular dependencies. Prefer restructuring the dependency graph to eliminate the cycle.
6. **No feature logic in `AppModule`** — `AppModule` wires infrastructure (database, config, global guards) and lists feature modules in `imports`. Nothing else.

---

## `AppModule` responsibilities

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),   // env vars available everywhere
    TerminusModule,                             // health check infrastructure
    TypeOrmModule.forRootAsync({ ... }),         // database connection
    FeatureAModule,
    FeatureBModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },  // global JWT guard
  ],
})
export class AppModule {}
```

The global `HttpExceptionFilter` is registered in `main.ts` via `app.useGlobalFilters()`, not as an `APP_FILTER` provider.

---

## Import path convention

All cross-module imports use `src/` absolute-style imports — never relative `../../` paths:

```typescript
// correct
import { OrderService } from 'src/order/order.service';
import { ProductModule } from 'src/product/product.module';

// wrong
import { OrderService } from '../../order/order.service';
```

This works via `baseUrl: "./"` in `tsconfig.json` — no explicit `paths` mapping is needed.

---

## Naming

| Artifact | Convention | Example |
|----------|-----------|---------|
| File | `<feature>.module.ts` | `order.module.ts` |
| Class | `<Feature>Module` | `OrderModule` |
| Location | `src/<feature>/` | `src/order/order.module.ts` |
