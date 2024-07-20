import { createConnection } from "typeorm";
import dotenv  from 'dotenv';
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { parse } from "path";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.prod' });
} else {
  dotenv.config({ path: '.env.dev' });
}

(async function () {
  let options: PostgresConnectionOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [parse(require.resolve("@aimingle/entity")).dir + "/entity/*.js"],
    synchronize: true,
    logging: process.env.NODE_ENV === 'development' ? true : false,
    namingStrategy: new SnakeNamingStrategy(),
  }
  await createConnection(options).then(() => {
    console.log("Database connection established successfully :"+ process.env.PORT);
  }).catch(error => console.log(error));
})();