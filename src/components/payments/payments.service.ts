import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import Stripe from 'stripe';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MessageEnum } from '../../common/enums/message.enum';

@Injectable()
export class PaymentsService {
    readonly useDeclinedCard = true;

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


            // Check if payment intent already exists 
            const existingPayment = await this.prisma.payment.findFirst({
                where: {
                    user: {
                        stripeCustomerId: dto.customer
                    },
                    amount: dto.amount,
                    currency: dto.currency || MessageEnum.swaggerExample.DEFAULT_CURRENCY,
                    status: 'pending',
                    createdAt: {
                        gte: new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
                    }
                }
            });

            if (existingPayment) {
                // Return existing payment intent to prevent duplicate
                return {
                    id: existingPayment.stripePaymentIntentId,
                    clientSecret: existingPayment.clientSecret,
                    amount: Number(existingPayment.amount),
                    currency: existingPayment.currency,
                };
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
            },
            );

            // Store payment intent in database immediately using createPaymentsAtDb
            const tempIntent = {
                ...intent,
                customer: dto.customer,
            } as Stripe.PaymentIntent;
            
            await this.createPaymentsAtDb(tempIntent, 'pending', metadata);

            return {
                id: intent.id,
                clientSecret: intent.client_secret,
                amount: intent.amount, // optional
                currency: intent.currency, // optional
            }
        } catch (error) {
            console.error('Stripe Error: createPaymentIntent', error);
            throw new BadRequestException(MessageEnum.error.BAD_REQUEST);
        }
    }

    async confirmPaymentIntent(paymentIntentId: string) {
        try {
            const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: this.useDeclinedCard ? MessageEnum.swaggerExample.DECLINED_PAYMENT_METHOD_ID : MessageEnum.swaggerExample.PAYMENT_METHOD_ID, // Stripe test Visa card
            });
            return confirmedIntent;
        } catch (error) {
            // Extract failure reason from Stripe error
            let failureReason = 'Unknown error';
            
            if (error.type === 'StripeCardError') {
                failureReason = error.message || error.code;
            } else if (error.raw?.message) {
                failureReason = error.raw.message;
            } else if (error.message) {
                failureReason = error.message;
            }

            // Update payment status to failed with failure reason
            await this.prisma.payment.update({
                where: { stripePaymentIntentId: paymentIntentId },
                data: {
                    status: 'failed',
                    failureReason: failureReason,
                },
            });
            throw error;
        }
    }

    async refundPayment(paymentIntentId: string, amount?: number) {
        try {
            // Find payment in database
            const payment = await this.prisma.payment.findUnique({
                where: { stripePaymentIntentId: paymentIntentId }
            });

            if (!payment) {
                throw new BadRequestException(MessageEnum.error.PAYMENT_NOT_FOUND);
            }

            // Check if already fully refunded
            if (payment.status === 'refunded') {
                throw new BadRequestException(MessageEnum.error.PAYMENT_ALREADY_REFUNDED);
            }

            // Check if trying to refund more than available
            const refundedAmount = payment.refundedAmount ? Number(payment.refundedAmount) : 0;
            const totalAmount = Number(payment.amount);
            const availableForRefund = totalAmount - refundedAmount;

            if (amount && amount > availableForRefund) {
                throw new BadRequestException(`Only ${availableForRefund} available for refund`);
            }

            // Create refund in Stripe
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount, // undefined = full refund
            });

            // Update payment in database
            const newRefundedAmount = refundedAmount + refund.amount;
            const isFullyRefunded = newRefundedAmount >= totalAmount;

            await this.prisma.payment.update({
                where: { stripePaymentIntentId: paymentIntentId },
                data: {
                    status: isFullyRefunded ? 'refunded' : 'partially_refunded',
                    refundedAmount: newRefundedAmount,
                    refundedAt: isFullyRefunded ? new Date() : payment.refundedAt,
                }
            });

            return refund;
        } catch (error) {
            console.error('Refund Error:', error);
            throw new BadRequestException(error.message);
        }
    }

    async createPaymentsAtDb(intent: Stripe.PaymentIntent, status: string = 'succeeded', metadata = {}) {
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

            // Check if payment already exists
            const existingPayment = await this.prisma.payment.findUnique({
                where: { stripePaymentIntentId: intent.id }
            });

            if (existingPayment) {
                // Update existing payment with provided status
                const updateData: any = { status };
                if (status === 'succeeded') {
                    updateData.completedAt = new Date();
                }
                return await this.prisma.payment.update({
                    where: { stripePaymentIntentId: intent.id },
                    data: updateData,
                });
            }

            // Create new payment record
            const paymentData: any = {
                userId: user.id,
                amount: intent.amount,
                currency: intent.currency,
                clientSecret: intent.client_secret || "",
                stripePaymentIntentId: intent.id,
                status,
                metadata,
            };
            
            if (status === 'succeeded') {
                paymentData.completedAt = new Date();
            }
            
            return await this.prisma.payment.create({
                data: paymentData,
            });
        } catch (error) {
            console.error('DB Error: createPaymentsAtDb', error);
            throw new BadRequestException(MessageEnum.error.BAD_REQUEST);
        }
    }
}
