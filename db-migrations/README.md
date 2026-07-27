# Database Migrations

This folder contains Flyway-style sequential SQL migration files.

## Naming convention

```
V<N>__<Description>.sql
```

- `N` — monotonically increasing integer starting at 1.
- Description — underscore-separated words, sentence case.

## Example

```
V1__Create_initial_tables.sql
V2__Add_orders_table.sql
V3__Add_soft_delete_to_products.sql
```

## Rules

1. Begin every file with `SET search_path TO <schema_name>;`
2. Use identity columns for primary keys: `id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
3. Timestamps: `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`
4. Enum columns: declare as `VARCHAR(255)` in SQL (TypeORM maps the enum at the application layer)
5. Create indexes for every foreign key column and every column used in WHERE clauses
6. Never edit a previously committed migration — always add a new `V<N+1>` file

See `.kiro/steering/entities.md` for the full migration standards.
