import { DataSource } from 'typeorm';
import { PluralNamingStrategy } from './strategies/plural-naming.strategy';
import { Tag } from './tags/tag.entity';
import { Resource } from './resources/resources.entity';
import { Score } from './score/score.entity';
import { User } from './users/user.entity';
import { envUtility } from './utils/env';

/**
 * The AppDataSource is a TypeORM DataSource instance configured for connecting to a PostgreSQL database.
 * It uses the validated env utility (utils/env.ts) to determine the database connection parameters, including host, port, username, password, and database name.
 * The DataSource is set up with a custom naming strategy (PluralNamingStrategy) and specifies the entities and migrations to be used.
 *
 * Note: The synchronize option is set to false to prevent automatic schema synchronization in production environments.
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: envUtility.POSTGRES_HOST,
  port: envUtility.POSTGRES_PORT,
  username: envUtility.POSTGRES_USER,
  password: envUtility.POSTGRES_PASSWORD,
  database: envUtility.POSTGRES_DB,
  // Entities are imported directly rather than globbed by path, since glob
  // strings don't resolve once the app is bundled/copied for production.
  entities: [Tag, Resource, Score, User],
  migrations: [
    'apps/backend/src/migrations/*.js',
    'apps/backend/src/migrations/*.ts',
  ],
  // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data
  synchronize: false,
  namingStrategy: new PluralNamingStrategy(),
});

export default AppDataSource;
