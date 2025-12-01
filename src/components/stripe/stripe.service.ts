import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class StripeService {

    constructor(@Inject('STRIPE_CLIENT') private stripe: Stripe) { }

    async createPaymentIntent(amount: number, currency: string, customer: string, metadata = {}) {
        try {
            if (currency === 'jod' && amount < 200) {
                throw new BadRequestException(
                    'Minimum charge for JOD is 200 fils (0.200 JOD)'
                );
            }

            const intent = await this.stripe.paymentIntents.create({
                customer,
                amount,
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });

            return {
                id: intent.id,
                amount: intent.amount,
                currency: intent.currency,
                clientSecret: intent.client_secret
            }
        } catch (error) {
            console.error('Stripe Error: createPaymentIntent', error);
            throw new BadRequestException(error.message);
        }
    }


    async createCustomer(dto: CreateCustomerDto) {
        return this.stripe.customers.create({
            email: dto.email,
            name: dto.name
        });
    }

    async confirmPaymentIntent(paymentIntentId: string) {
        return this.stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: 'pm_card_visa', // Stripe test Visa card
        });
    }
}
