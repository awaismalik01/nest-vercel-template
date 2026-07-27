import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSampleDto {
  @ApiProperty({ description: 'Unique name for the sample', example: 'my-sample' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional description', example: 'A sample resource' })
  @IsOptional()
  @IsString()
  description?: string;
}
