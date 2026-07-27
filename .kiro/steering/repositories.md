# Repository Standards

Applies to any NestJS + TypeORM project that uses a `BaseRepository` pattern.

---

## Base class

Every repository **must** extend `BaseRepository<T>` from `src/config/base.repository`.  
Never inject TypeORM's `Repository<T>` directly into services.

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/config/base.repository';
import { MyEntity } from './my.entity';

@Injectable()
export class MyRepository extends BaseRepository<MyEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, MyEntity);
  }
}
```

---

## `BaseRepository` API

The base class provides overloaded signatures that accept an optional `EntityManager` and optional TypeORM options:

| Method | Signatures | Notes |
|--------|-----------|-------|
| `findOne` | `findOne(options, manager?)` | Pass `FindOneOptions<T>` |
| `save` | `save(entity, manager?)` | Single entity |
| `save` | `save(entity, options, manager?)` | Single entity with `SaveOptions` |
| `save` | `save(entities, manager?)` | Array of entities |
| `save` | `save(entities, options, manager?)` | Array with `SaveOptions` |
| `remove` | `remove(entity, manager?)` | Single entity |
| `remove` | `remove(entity, options, manager?)` | Single entity with `RemoveOptions` |

The `manager?: EntityManager` parameter is resolved via overloading — if the second argument is an `EntityManager` instance it is treated as the manager; otherwise it is treated as options and `manager` comes from the third argument.

Pass `manager` when the call must participate in an ambient `DataSource.transaction()`.

---

## Transaction pattern

Transactions are owned by the service layer. Repositories never open their own transactions — they only accept an `EntityManager` from outside.

```typescript
// Service
await this.dataSource.transaction(async (manager) => {
  await this.fooRepository.save(entity, manager);
  await this.barRepository.remove(other, manager);
});
```

---

## Adding custom query methods

When the base API is not enough, add the method directly to the concrete repository class. Always accept `manager?` and pass it to `this.getRepo()`.

```typescript
@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(dataSource, Product);
  }

  async findBySlug(slug: string, manager?: EntityManager): Promise<Product | null> {
    return this.getRepo(manager).findOne({ where: { slug } });
  }
}
```

`this.getRepo(manager)` (protected on `BaseRepository`) returns the transaction-scoped repository when `manager` is present, or the default one otherwise.

---

## Module registration

Register the repository as a `provider`. Do not export it — export the service instead.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([MyEntity])],
  providers: [MyService, MyRepository],
  exports: [MyService],
})
export class MyModule {}
```

---

## Naming

| Artifact | Convention | Example |
|----------|-----------|---------|
| File | `<feature>.repository.ts` | `role.repository.ts` |
| Class | `<Feature>Repository` | `RoleRepository` |
| Location | `src/<feature>/` | `src/role/role.repository.ts` |

Entities stored under `src/<feature>/entities/` keep their repository at the feature root (e.g. `src/events/event-log.repository.ts`).

---

## What NOT to do

- Do not call `this.dataSource.getRepository(Entity)` directly in a service.
- Do not use `@InjectRepository()` — all DB access goes through custom repository classes.
- Do not open transactions inside a repository method.
- Do not add HTTP-layer concerns (DTOs, status codes, `HttpException`) to repositories.
