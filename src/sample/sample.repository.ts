import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BaseRepository } from 'src/config/base.repository';
import { Sample } from './sample.entity';

@Injectable()
export class SampleRepository extends BaseRepository<Sample> {
  constructor(dataSource: DataSource) {
    super(dataSource, Sample);
  }

  async findByName(
    name: string,
    manager?: EntityManager,
  ): Promise<Sample | null> {
    return this.getRepo(manager).findOne({ where: { name } });
  }
}
