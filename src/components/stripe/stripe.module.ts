import { Module } from '@nestjs/common';
import { serviceConfig } from '../../config/env.config';
import { StripeWebhookController } from '../webhook/webhook.controller';
import { WebhookService } from '../webhook/webhook.service';
import { STRIPE_CLIENT, stripeClientProvider } from './stripe.client';
import { PaymentsService } from '../payments/payments.service';
import { PaymentsController } from '../payments/payments.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../../prisma/prisma.module';


@Module({
  imports: [
    JwtModule.register({
      secret: serviceConfig.service.jwtSecret,
      signOptions: { expiresIn: serviceConfig.service.jwtExpiry },
    }),
    PrismaModule,
  ],
  providers: [
    stripeClientProvider,
    PaymentsService,
    WebhookService,
  ],
  controllers: [
    PaymentsController,
    StripeWebhookController,
  ],
  exports: [
    PaymentsService,
    STRIPE_CLIENT,
  ],
})
export class StripeModule { }
