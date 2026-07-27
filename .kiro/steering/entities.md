# Entity & Database Migration Standards

Applies to any NestJS + TypeORM + PostgreSQL project.

---

## Entity rules

### File & class naming

| Artifact | Convention | Example |
|----------|-----------|---------|
| File | `<name>.entity.ts` | `product.entity.ts` |
| Class | PascalCase noun | `Product`, `OrderLine` |
| Location | `src/<feature>/` or `src/<feature>/entities/` | `src/product/product.entity.ts` |
| Table name | Pass to `@Entity()` when it differs from the class name | `@Entity('event_logs')` |

Pass the table name string to `@Entity('table_name')` when the table name differs from the default TypeORM derivation (e.g. multi-word names, plural forms). For single-word entities where the default matches (e.g. `User` → `user`, `Role` → `role`), bare `@Entity()` is acceptable.

---

### Primary keys

All entities use auto-increment integer primary keys:

```typescript
@PrimaryGeneratedColumn()
id!: number;
```

The corresponding SQL is `INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`. Never use `SERIAL` — it is superseded by identity columns in PostgreSQL 10+.

---

### Timestamps

Every entity must have `created_at` and `updated_at`:

```typescript
@CreateDateColumn({ type: 'timestamp with time zone' })
created_at!: Date;

@UpdateDateColumn({ type: 'timestamp with time zone' })
updated_at!: Date;
```

---

### Column definitions

- Always specify `type` explicitly — never rely on TypeORM inference.
- Nullable columns use `nullable: true` and `| null` in TypeScript:
  ```typescript
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
  ```
- Enum columns use the TypeScript enum and `type: 'enum'`:
  ```typescript
  @Column({ type: 'enum', enum: OrderStatusEnum })
  status!: OrderStatusEnum;
  ```
  The enum must have explicit string values (see DTO standards).
- UUID columns that are not the primary key (e.g. an external reference ID) use `type: 'uuid'`:
  ```typescript
  @Column({ type: 'uuid' })
  externalId!: string;
  ```
- JSON/JSONB columns use `type: 'jsonb'`:
  ```typescript
  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;
  ```
- Boolean columns with defaults:
  ```typescript
  @Column({ type: 'boolean', default: false })
  is_email_verified!: boolean;
  ```

---

### Non-null assertion (`!`)

Use `!` on every entity property — TypeORM assigns them at runtime, not in the constructor.

---

### Relationships

Declare the inverse side on both entities. Use `@JoinTable` only on the owning side of `@ManyToMany`.

```typescript
// owning side
@ManyToMany(() => Role, (role) => role.users)
@JoinTable({
  name: 'user_roles',
  joinColumn:        { name: 'user_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
})
roles!: Role[];

// inverse side
@ManyToMany(() => User, (user) => user.roles)
users!: User[];
```

---

### No business logic in entities

Entities are pure data containers — no service calls, no computed properties that trigger DB queries, no methods beyond simple derived getters.

---

## Database migration standards

### File naming

Migrations use Flyway-style sequential versioning:

```
V<N>__<Description>.sql
```

- `N` — monotonically increasing integer starting at 1.
- Description — underscore-separated words, sentence case.
- Location — `db-migrations/` at the project root.

```
V1__Create_initial_tables.sql
V2__Create_event_logs_table.sql
V3__Add_soft_delete_to_orders.sql
```

---

### Migration content rules

1. **Schema path** — begin every file with `SET search_path TO <schema_name>;`.

2. **Primary keys** — use identity columns, not `SERIAL`:
   ```sql
   id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
   ```

3. **UUID reference columns** — use the `uuid` type directly; no extension needed for storage:
   ```sql
   external_id UUID NOT NULL
   ```
   If you need a UUID default, enable `pgcrypto`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   -- then use:
   reference_id UUID NOT NULL DEFAULT gen_random_uuid()
   ```

4. **Timestamps** — always `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`.

5. **Enum columns** — declare as `VARCHAR(255)` in SQL; TypeORM maps the enum at the application layer.

6. **Indexes** — create an index for:
   - every foreign key column
   - every column used in a `WHERE` clause
   - `created_at` on append-only / audit tables
   ```sql
   CREATE INDEX idx_<table>_<column> ON <table>(<column>);
   ```

7. **Immutability** — never edit a previously committed migration file. Always add a new `V<N+1>` file.

8. **Destructive changes** — dropping and recreating a table is acceptable for append-only audit logs with no live data dependency. For tables with live data, provide a data migration plan.

---

### `synchronize` flag

`synchronize: true` is for local development only (guard it with an env check such as `PRODUCTION !== 'true'`). All production schema changes must go through a versioned migration file.
