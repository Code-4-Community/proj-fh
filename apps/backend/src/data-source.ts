import { DataSource } from 'typeorm';
import { PluralNamingStrategy } from './strategies/plural-naming.strategy';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.NX_DB_HOST ?? process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(
    process.env.NX_DB_PORT ?? process.env.POSTGRES_PORT ?? '5432',
    10,
  ),
  username: process.env.NX_DB_USERNAME ?? process.env.POSTGRES_USER,
  password: process.env.NX_DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
  database: process.env.NX_DB_DATABASE ?? process.env.POSTGRES_DB,
  entities: [],
  migrations: ['apps/backend/src/migrations/*.js'],
  // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data
  synchronize: false,
  namingStrategy: new PluralNamingStrategy(),
});

export default AppDataSource;
