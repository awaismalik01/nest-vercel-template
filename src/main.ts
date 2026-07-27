import { NestFactory } from '@nestjs/core';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<string>('DOMAIN'),
    credentials: true,
  });
  app.use(cookieParser());
  const contextPath = configService.get<string>('CONTEXT_PATH') ?? 'api';
  app.setGlobalPrefix(contextPath);

  if (configService.get<string>('SWAGGER') === 'true') {
    setupSwagger(app, contextPath);
  }

  await app.listen(configService.get<string>('PORT') ?? 8080);
}
void bootstrap();
