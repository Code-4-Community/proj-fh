/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureGlobalApp, GLOBAL_PREFIX } from './configure-app';
import { envUtility } from './utils/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureGlobalApp(app);

  const port = 3000;

  if (envUtility.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('[YOUR_APP_NAME] API Docs')
      .setDescription('Documentation for [YOUR_APP_NAME] API routes')
      .addBearerAuth({
        type: 'http',
        description:
          '[TL] Replace: how clients obtain a Bearer token for this API.',
      })
      .addTag('Users', 'Operations on users')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config); // Create the Swagger document
    SwaggerModule.setup('api', app, document); // Setup the Swagger module
    Logger.log(
      `Swagger is enabled and will be available at: http://localhost:${port}/api`,
    );
  }

  await app.listen(port);

  Logger.log(
    `Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`,
  );
}
bootstrap();
