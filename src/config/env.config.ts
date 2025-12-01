import { envVars } from "./validate-env.config";

export const serviceConfig = {
    service: {
        nodeEnv: envVars.NODE_ENV,
        appName: envVars.APP_NAME,
        appVersion: envVars.APP_VERSION,
        jwtSecret: envVars.JWT_SECRET,
        jwtExpiry: envVars.JWT_EXPIRY,
        jwtRefreshSecret: envVars.JWT_REFRESH_SECRET,
        jwtRefreshExpiry: envVars.JWT_REFRESH_EXPIRY,
    },
    db: {
        port: envVars.DB_PORT,
        host: envVars.DB_HOST,
        username: envVars.DB_USERNAME,
        password: envVars.DB_PASSWORD,
        name: envVars.DB_NAME,
        url: envVars.DB_URL,
    },
    stripe: {
        secretKey: envVars.STRIPE_SECRET_KEY,
        publishableKey: envVars.STRIPE_PUBLISHABLE_KEY,
        webhookKey: envVars.STRIPE_WEBHOOK_SECRET,
        apiVersion: envVars.API_VERSION
    }
};