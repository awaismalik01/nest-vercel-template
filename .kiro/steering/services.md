# Service Standards

Applies to any NestJS project.

---

## Responsibility

Services own all business logic. The layering is strict:

```
Controller  →  Service  →  Repository  →  Database
```

Services must not:
- Touch the HTTP response object (`res.cookie()`, `res.header()`, etc.) — that belongs in the controller.
- Import another feature's repository directly — import the other feature's **service** instead.
- Duplicate logic that already exists in another service — import it.

---

## Class setup

```typescript
@Injectable()
export class FeatureService {
  private logger: Logger = new Logger(FeatureService.name);

  constructor(
    private readonly featureRepository: FeatureRepository,
    // inject other services as needed — never raw Repository<T>
  ) {}
}
```

---

## Method structure

Every non-trivial public method follows this pattern:

```typescript
public async doSomething(input: string, manager?: EntityManager): Promise<ResultType> {
  this.logger.log('Start: doSomething');
  try {
    const result = await this.featureRepository.findOne({ where: { field: input } }, manager);
    if (!result) {
      this.logger.warn(`doSomething failed: thing '${input}' not found`);
      throw new NotFoundException(`Thing '${input}' not found`);
    }
    return result;
  } catch (error: unknown) {
    if (error instanceof NotFoundException) throw error;
    if (error instanceof BadRequestException) throw error;
    this.logger.error('Error in doSomething: ' + error);
    throw new InternalServerErrorException('Unexpected error in doSomething');
  } finally {
    this.logger.log('End: doSomething');
  }
}
```

### Rules

1. **Log start and end** of every non-trivial public method.
2. **Log before throwing** — `logger.warn()` immediately before any 4xx exception, `logger.error()` immediately before any 5xx exception.
3. **Re-throw known NestJS `HttpException` subclasses** unchanged in the catch block — they were already logged at the throw site.
4. **Only log `error` in catch for unknown errors** — the catch block should not redundantly log known 4xx exceptions.
5. **Wrap unknown errors** in `InternalServerErrorException` — never let a raw `Error` propagate to the controller.
6. **Branch on `instanceof`**, not on `.message` string matching.
7. **Return DTOs or plain objects**, not entity instances, unless the entity is only consumed internally within the same service.
8. **Accept `manager?: EntityManager`** on methods that may participate in a transaction initiated by another service (e.g. events batch processing calling into user/role services).

---

## Transactions

Services that need atomicity call `DataSource.transaction()` and thread the `EntityManager` down to every repository call.

```typescript
constructor(
  private readonly dataSource: DataSource,
  private readonly fooRepository: FooRepository,
  private readonly barRepository: BarRepository,
) {}

public async doAtomicWork(): Promise<void> {
  this.logger.log('Start: doAtomicWork');
  try {
    await this.dataSource.transaction(async (manager) => {
      await this.fooRepository.save(foo, manager);
      await this.barRepository.remove(bar, manager);
    });
  } catch (error: unknown) {
    this.logger.error('Error in doAtomicWork: ' + error);
    throw new InternalServerErrorException('Failed to complete operation');
  } finally {
    this.logger.log('End: doAtomicWork');
  }
}
```

Repositories never open their own transactions. If an operation inside the block re-throws, the entire transaction rolls back automatically.

### Cross-service transaction participation

When a service method is called by another service that owns the transaction, accept `manager?: EntityManager` and pass it through to all repository calls:

```typescript
public async createUser(username: string, manager?: EntityManager): Promise<User> {
  this.logger.log('Start: createUser');
  try {
    const existing = await this.userRepository.findOne({ where: { username } }, manager);
    if (existing) {
      this.logger.warn(`Create user failed: user '${username}' already exists`);
      throw new BadRequestException(`User '${username}' already exists`);
    }

    const user = new User();
    user.username = username;
    await this.userRepository.save(user, manager);
    return user;
  } catch (error: unknown) {
    if (error instanceof BadRequestException) throw error;
    this.logger.error('Error creating user: ' + error);
    throw new InternalServerErrorException('Error creating user');
  } finally {
    this.logger.log('End: createUser');
  }
}
```

---

## Batch processing pattern

For batch operations that process items independently (where one failure should not abort the rest), catch errors per-item and collect results:

```typescript
public async processEvents(events: EventDto[]): Promise<EventStatusDto[]> {
  this.logger.log('Start: processEvents');

  const statusList: EventStatusDto[] = [];

  for (const event of events) {
    try {
      await this.handleEvent(event);
      statusList.push({ id: event.id, status: EventStatusEnum.SUCCESS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Event ${event.id} failed: ${message}`);
      statusList.push({ id: event.id, status: EventStatusEnum.FAILED, errorMessage: message });
    }
  }

  this.logger.log('End: processEvents');
  return statusList;
}
```

---

## Error message conventions

- Include the entity name and the lookup value: `NotFoundException(\`Order '${orderId}' not found\`)`
- Keep messages short and factual — they reach the client via the global exception filter.
- Log internal details (stack, context) at the logger level, never in the exception message.

---

## Logging levels

| Situation | Level |
|-----------|-------|
| Normal start / end of a method | `logger.log()` |
| Immediately before throwing a 4xx exception | `logger.warn()` |
| Expected, handled failure (e.g. per-item failure in a batch) | `logger.warn()` |
| Immediately before throwing a 5xx exception | `logger.error()` |
| Unexpected or unrecoverable error (catch block, unknown error) | `logger.error()` |

### Logging pattern in catch blocks

```typescript
} catch (error: unknown) {
  // Re-throw known 4xx — already logged at the throw site
  if (error instanceof NotFoundException) throw error;
  if (error instanceof BadRequestException) throw error;
  // Only log unknown errors before wrapping in 5xx
  this.logger.error('Error in methodName: ' + error);
  throw new InternalServerErrorException('Unexpected error in methodName');
}
```

---

## Naming

| Artifact | Convention | Example |
|----------|-----------|---------|
| File | `<feature>.service.ts` | `order.service.ts` |
| Class | `<Feature>Service` | `OrderService` |
| Location | `src/<feature>/` | `src/order/order.service.ts` |
| Public methods | camelCase verb + noun | `createOrder`, `findOrderById`, `cancelOrder` |
