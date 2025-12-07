import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Stripe from 'stripe';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MessageEnum } from '../../common/enums/message.enum';

@Injectable()
export class PaymentsService {
    readonly useDeclinedCard = false;

    constructor(
        private readonly prisma: PrismaService,
        @Inject('STRIPE_CLIENT') private stripe: Stripe,

    ) { }

    async createPaymentIntent(dto: CreatePaymentDto, metadata = {}) {
        try {
            // check the currency and its min valid amount
            if (dto.currency === MessageEnum.swaggerExample.CURRENCY && dto.amount < MessageEnum.swaggerExample.MIN_AMOUNT) {
                throw new BadRequestException(MessageEnum.error.PAYMENT_MIN_AMOUNT);
            }

            // creating payment intent
            const intent = await this.stripe.paymentIntents.create({
                customer: dto.customer,
                amount: dto.amount,
                currency: dto.currency || MessageEnum.swaggerExample.DEFAULT_CURRENCY,
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

    async confirmPaymentIntent(paymentIntentId: string) {
        return this.stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: this.useDeclinedCard ? MessageEnum.swaggerExample.DECLINED_PAYMENT_METHOD_ID : MessageEnum.swaggerExample.PAYMENT_METHOD_ID, // Stripe test Visa card

        });
    }

    async refundPayment(paymentIntentId: string) {
        return this.stripe.refunds.create({
            payment_intent: paymentIntentId,
        })
    }

    async createPaymentsAtDb(intent: Stripe.PaymentIntent) {
        try {
            const stripeCustomerId = intent.customer

            if (!stripeCustomerId) {
                throw new BadRequestException(MessageEnum.error.PAYMENT_NO_CUSTOMER);
            }

            // Find the user using stripeCustomerId
            const user = await this.prisma.user.findUnique({
                where: { stripeCustomerId: String(stripeCustomerId) }
            });

            if (!user) {
                throw new BadRequestException(MessageEnum.error.PAYMENT_NO_USER);
            }

            return await this.prisma.payment.create({
                data: {
                    userId: user.id,
                    amount: intent.amount,
                    currency: intent.currency,
                    clientSecret: intent.client_secret || "",
                },
            });
        } catch (error) {
            console.error('DB Error: createPaymentsAtDb', error);
            throw new BadRequestException(error.message);
        }
    }
}
