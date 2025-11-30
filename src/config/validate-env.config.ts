import Joi from 'joi';
// Define a Joi schema for your env variables
import * as dotenv from 'dotenv';
import * as path from 'path';
const nodeEnv = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(process.cwd(), `.env`);
dotenv.config({ path: envFilePath });

export const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
    APP_VERSION: Joi.string().required(),
    APP_NAME: Joi.string().required(),

    DB_PORT: Joi.number().required(),
    DB_HOST: Joi.string().required(),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),

    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRY: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_REFRESH_EXPIRY: Joi.string().required(),

}).unknown(); // allow other env variables

export const { error, value: envVars } = envSchema.validate(process.env, { abortEarly: false });
if (error) {
    console.error('Environment validation error(s):', error.details.map(d => d.message).join('; '));
    process.exit(1);
}
console.log(envVars)