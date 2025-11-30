import { DocumentBuilder } from "@nestjs/swagger";
import { serviceConfig } from "./env.config";

export const swaggerConfig = new DocumentBuilder()
    .setTitle(serviceConfig.service.appName)
    .setDescription(`${serviceConfig.service.appName} API documentation`)
    .setVersion(serviceConfig.service.appVersion)
    .addBearerAuth()
    .build();