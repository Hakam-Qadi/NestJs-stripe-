import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttachCardDto } from './dto/attach-card.dto';

@Injectable()
export class StripeService {

    constructor(
        @Inject('STRIPE_CLIENT') private stripe: Stripe,
        private readonly prisma: PrismaService,
    ) { }

    async createPaymentIntent(dto: CreatePaymentDto, metadata = {}) {
        try {
            // check the currency and its min valid amount
            if (dto.currency === 'jod' && dto.amount < 200) {
                throw new BadRequestException(
                    'Minimum charge for JOD is 200 fils (0.200 JOD)'
                );
            }

            // creating payment intent
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
            // console.log("INTENT (PAYMENT) :::::::: ", intent);

            return {
                id: intent.id,
                clientSecret: intent.client_secret,
                amount: intent.amount, // optional
                currency: intent.currency, // optional
            }
        } catch (error) {
            console.error('Stripe Error: createPaymentIntent', error);
            throw new BadRequestException(error.message);
        }
    }

    async createCustomer(dto: CreateCustomerDto) {
        const customer = await this.stripe.customers.create({
            email: dto.email,
            name: dto.name,
            payment_method: dto.paymentMethodId
        });

        await this.prisma.user.update({
            where: { email: dto.email },
            data: { stripeCustomerId: customer.id }
        });
        return customer
    }

    async confirmPaymentIntent(paymentIntentId: string) {
        return this.stripe.paymentIntents.confirm(paymentIntentId, {
            // payment_method: 'pm_card_visa', // Stripe test Visa card
            payment_method: "pm_card_chargeDeclined" // Stripe test decline Visa card
        });
    }

    async refundPayment(paymentIntentId: string) {
        return this.stripe.refunds.create({
            payment_intent: paymentIntentId,
        })
    }

    async attachCardToCustomer(dto: AttachCardDto) {
        try {
            // Attach card
            const paymentMethod = await this.stripe.paymentMethods.attach(
                dto.paymentMethodId,
                { customer: dto.customerId || "" }
            );

            // Set as default
            await this.stripe.customers.update(dto.customerId || "", {
                invoice_settings: { default_payment_method: dto.paymentMethodId },
            });

            return paymentMethod;

        } catch (error) {
            console.error("Error attaching card:", error);
            throw new BadRequestException(error.message);
        }
    }

}
