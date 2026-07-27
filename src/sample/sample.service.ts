import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SampleRepository } from './sample.repository';
import { Sample } from './sample.entity';
import { CreateSampleDto } from './dto/create-sample.dto';
import { SampleResponseDto } from './dto/sample-response.dto';

@Injectable()
export class SampleService {
  private logger: Logger = new Logger(SampleService.name);

  constructor(private readonly sampleRepository: SampleRepository) {}

  public async create(
    dto: CreateSampleDto,
    manager?: EntityManager,
  ): Promise<SampleResponseDto> {
    this.logger.log('Start: create');
    try {
      const existing = await this.sampleRepository.findByName(
        dto.name,
        manager,
      );
      if (existing) {
        this.logger.warn(`Create failed: sample '${dto.name}' already exists`);
        throw new BadRequestException(
          `Sample '${dto.name}' already exists`,
        );
      }

      const sample = new Sample();
      sample.name = dto.name;
      sample.description = dto.description ?? null;

      const saved = await this.sampleRepository.save(sample, manager);
      return this.toResponse(saved);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error in create: ' + error);
      throw new InternalServerErrorException('Unexpected error in create');
    } finally {
      this.logger.log('End: create');
    }
  }

  public async findById(
    id: number,
    manager?: EntityManager,
  ): Promise<SampleResponseDto> {
    this.logger.log('Start: findById');
    try {
      const sample = await this.sampleRepository.findOne(
        { where: { id } },
        manager,
      );
      if (!sample) {
        this.logger.warn(`findById failed: sample '${id}' not found`);
        throw new NotFoundException(`Sample '${id}' not found`);
      }
      return this.toResponse(sample);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error in findById: ' + error);
      throw new InternalServerErrorException('Unexpected error in findById');
    } finally {
      this.logger.log('End: findById');
    }
  }

  private toResponse(sample: Sample): SampleResponseDto {
    const dto = new SampleResponseDto();
    dto.id = sample.id;
    dto.name = sample.name;
    dto.description = sample.description;
    dto.status = sample.status;
    dto.created_at = sample.created_at.toISOString();
    return dto;
  }
}
