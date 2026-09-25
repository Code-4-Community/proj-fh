import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import AppDataSource from './data-source';
import { UsersModule } from './users/users.module';
import { ResourcesController } from './resources/resources.controller';
import { ResourcesService } from './resources/resources.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    UsersModule,
  ],
  controllers: [AppController, ResourcesController],
  providers: [AppService, ResourcesService],
})
export class AppModule {}
