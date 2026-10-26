import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import AppDataSource from './data-source';
import { UsersModule } from './users/users.module';
import { TagsModule } from './tags/tags.module';
import { ResourcesModule } from './resources/resources.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Reuse the caller's x-request-id if present, otherwise make a new one.
        genReqId: (req) => {
          const existing = req.headers['x-request-id'];
          return (
            (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID()
          );
        },
        // Replace these values with [Redacted] before the line is written.
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[Redacted]',
        },
        // Readable colored output while developing, raw JSON in production.
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      migrations: [], // Don't load migrations when server starts - only load them when running migration commands (i had to add this to get the server to run without errors)
    }),
    UsersModule,
    ResourcesModule,
    TagsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}