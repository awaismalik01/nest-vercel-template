import {
  DataSource,
  EntityTarget,
  EntityManager,
  Repository,
  ObjectLiteral,
  FindOneOptions,
  SaveOptions,
  RemoveOptions,
} from 'typeorm';

export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(
    protected readonly dataSource: DataSource,
    private readonly entity: EntityTarget<T>,
  ) { }

  protected getRepo(manager?: EntityManager): Repository<T> {
    return manager
      ? manager.getRepository<T>(this.entity)
      : this.dataSource.getRepository<T>(this.entity);
  }

  public findOne(options: FindOneOptions<T>, manager?: EntityManager) {
    return this.getRepo(manager).findOne(options);
  }

  public save(entity: T, options?: SaveOptions, manager?: EntityManager): Promise<T>;
  public save(entity: T, manager?: EntityManager): Promise<T>;
  public save(entities: T[], options?: SaveOptions, manager?: EntityManager): Promise<T[]>;
  public save(entities: T[], manager?: EntityManager): Promise<T[]>;
  public save(
    entityOrEntities: T | T[],
    optionsOrManager?: SaveOptions | EntityManager,
    manager?: EntityManager,
  ): Promise<T | T[]> {
    const resolvedManager = optionsOrManager instanceof EntityManager ? optionsOrManager : manager;
    const resolvedOptions = optionsOrManager instanceof EntityManager ? undefined : optionsOrManager;
    return this.getRepo(resolvedManager).save(entityOrEntities as any, resolvedOptions);
  }

  public remove(entity: T, options?: RemoveOptions, manager?: EntityManager): Promise<T>;
  public remove(entity: T, manager?: EntityManager): Promise<T>;
  public remove(
    entity: T,
    optionsOrManager?: RemoveOptions | EntityManager,
    manager?: EntityManager,
  ): Promise<T> {
    const resolvedManager = optionsOrManager instanceof EntityManager ? optionsOrManager : manager;
    const resolvedOptions = optionsOrManager instanceof EntityManager ? undefined : optionsOrManager;
    return this.getRepo(resolvedManager).remove(entity, resolvedOptions);
  }
}
