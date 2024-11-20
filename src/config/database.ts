import dotenv from 'dotenv';
import path from 'path';
import { createConnection } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.prod' });
} else {
  dotenv.config({ path: '.env.dev' });
}

const aimingleEntityPath = path.join(
  path.dirname(require.resolve('@aimingle/entity')),
  '**',
  '*.{js,ts}'
);

console.log('Entities path:', aimingleEntityPath);

const entities = [aimingleEntityPath];

async function initializeDB() {
  const options: PostgresConnectionOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: entities,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    namingStrategy: new SnakeNamingStrategy(),
  };
  try {
    const connection = await createConnection(options);
    console.log('Registered Entities:', connection.entityMetadatas.map((meta) => meta.name));
    return connection;
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
}

export { initializeDB };
