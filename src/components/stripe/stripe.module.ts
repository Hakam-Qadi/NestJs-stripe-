import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import Stripe from 'stripe';
import { serviceConfig } from '../../config/env.config';
import { PaymentsModule } from '../payments/payments.module';
import { StripeWebhookController } from './stripe.webhook.controller';

@Module({
  imports: [PaymentsModule],
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      useFactory: () => {
        return new Stripe(serviceConfig.stripe.secretKey, {
          apiVersion: serviceConfig.stripe.apiVersion,
        });
      },
    },
    StripeService,
  ],
  controllers: [StripeController, StripeWebhookController],
  exports: ['STRIPE_CLIENT'],
})
export class StripeModule { }
