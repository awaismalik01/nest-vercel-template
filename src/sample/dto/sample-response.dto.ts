import { ApiProperty } from '@nestjs/swagger';
import { SampleStatusEnum } from '../enum/sample-status.enum';

export class SampleResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'my-sample' })
  name!: string;

  @ApiProperty({ type: String, nullable: true, example: 'A sample resource' })
  description!: string | null;

  @ApiProperty({ enum: SampleStatusEnum, example: SampleStatusEnum.ACTIVE })
  status!: SampleStatusEnum;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  created_at!: string;
}
