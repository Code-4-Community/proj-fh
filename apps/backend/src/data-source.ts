import { DataSource } from 'typeorm';
import { PluralNamingStrategy } from './strategies/plural-naming.strategy';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * The AppDataSource is a TypeORM DataSource instance configured for connecting to a PostgreSQL database.
 * It uses environment variables to determine the database connection parameters, including host, port, username, password, and database name.
 * The DataSource is set up with a custom naming strategy (PluralNamingStrategy) and specifies the entities and migrations to be used.
 * 
 * Note: The synchronize option is set to false to prevent automatic schema synchronization in production environments.
 */
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
  entities: ['apps/backend/src/tags/tags.entity.ts'],
  migrations: ['apps/backend/src/migrations/*.js', 'apps/backend/src/migrations/*.ts'],
  // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data
  synchronize: false,
  namingStrategy: new PluralNamingStrategy(),
});

export default AppDataSource;
