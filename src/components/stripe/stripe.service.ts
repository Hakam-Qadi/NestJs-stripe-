import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class StripeService {

    constructor(@Inject('STRIPE_CLIENT') private stripe: Stripe) { }

    async createPaymentIntent(dto: CreatePaymentDto, metadata = {}) {
        try {
            if (dto.currency === 'jod' && dto.amount < 200) {
                throw new BadRequestException(
                    'Minimum charge for JOD is 200 fils (0.200 JOD)'
                );
            }

            const intent = await this.stripe.paymentIntents.create({
                customer: dto.customer,
                amount: dto.amount,
                currency: dto.currency || 'jod',
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
            name: dto.name,
            payment_method: dto.paymentMethodId
        });
    }

    async confirmPaymentIntent(paymentIntentId: string) {
        return this.stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: 'pm_card_visa', // Stripe test Visa card
        });
    }

    async refundPayment(paymentIntentId: string) {
        return this.stripe.refunds.create({
            payment_intent: paymentIntentId,
        })
    }

    async attachCardToCustomer(dto: CreateCustomerDto) {
        try {
            // Attach card
            const paymentMethod = await this.stripe.paymentMethods.attach(
                dto.paymentMethodId,
                { customer: dto.customerId }
            );

            // Set as default
            await this.stripe.customers.update(dto.customerId, {
                invoice_settings: { default_payment_method: dto.paymentMethodId },
            });

            return paymentMethod;

        } catch (error) {
            console.error("Error attaching card:", error);
            throw new BadRequestException(error.message);
        }
    }

}
