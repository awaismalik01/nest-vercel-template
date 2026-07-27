import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SampleService } from './sample.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { SampleResponseDto } from './dto/sample-response.dto';
import {
  ApiController,
  ApiAuth,
  ApiAuthWithNotFound,
  ApiBodyPost,
} from 'src/decorator/api.decorator';

@ApiController('Sample')
@Controller('sample')
export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  @Post()
  @ApiBodyPost({
    summary: 'Create a new sample resource',
    bodyType: CreateSampleDto,
    responseType: SampleResponseDto,
    responseDescription: 'The created sample',
  })
  public async create(
    @Body() dto: CreateSampleDto,
  ): Promise<SampleResponseDto> {
    return this.sampleService.create(dto);
  }

  @Get(':id')
  @ApiAuthWithNotFound({
    summary: 'Get a sample by ID',
    type: SampleResponseDto,
    notFoundDescription: 'Sample not found',
  })
  public async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SampleResponseDto> {
    return this.sampleService.findById(id);
  }
}
