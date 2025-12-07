import { Provider } from '@nestjs/common';
import { serviceConfig } from '../../config/env.config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const stripeClientProvider: Provider = {
    provide: STRIPE_CLIENT,
    useFactory: () => {
        const secret = serviceConfig.stripe.secretKey;
        return new Stripe(secret, {
            apiVersion: serviceConfig.stripe.apiVersion,
        });
    },
};
