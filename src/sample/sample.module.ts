import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sample } from './sample.entity';
import { SampleRepository } from './sample.repository';
import { SampleService } from './sample.service';
import { SampleController } from './sample.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sample])],
  controllers: [SampleController],
  providers: [SampleService, SampleRepository],
  exports: [SampleService],
})
export class SampleModule {}
