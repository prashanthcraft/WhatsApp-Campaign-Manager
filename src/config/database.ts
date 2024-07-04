import { Sequelize } from 'sequelize';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: `.env.${process.env.NODE_ENV}` });

const databaseUrl = process.env.DATABASE_URL as string;
const jwtSecret = process.env.JWT_SECRET as string;

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});