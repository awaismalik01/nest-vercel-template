import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(
  app: INestApplication,
  contextPath: string,
): void {
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('PRODUCTION') === 'true';
  const appName = configService.get<string>('APP_NAME') ?? 'NestJS Service';

  const builder = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(`API documentation for ${appName}`)
    .setVersion('1.0');

  if (!isProduction) {
    builder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'JWT',
    );
  }

  const config = builder.build();

  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    if (!isProduction) {
      document.security = [
        {
          JWT: [],
        },
      ];
    }
    return document;
  };

  SwaggerModule.setup(`${contextPath}/swagger`, app, documentFactory, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.js',
    ],
  });
}
