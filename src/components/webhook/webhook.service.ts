import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { serviceConfig } from '../../config/env.config';
import { MessageEnum } from '../../common/enums/message.enum';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WebhookService {
    constructor(
        @Inject('STRIPE_CLIENT') private stripe: Stripe,
        private readonly prisma: PrismaService,
    ) { }

    verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
        const webhookSecret = serviceConfig.stripe.webhookKey;
        
        try {
            return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err) {
            console.error(MessageEnum.error.WEBHOOK_SIGNATURE_FAILED, err.message);
            throw new Error(MessageEnum.error.WEBHOOK_SIGNATURE_FAILED);
        }
    }

    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        // Check if event already processed (idempotency)
        const existingEvent = await this.prisma.webhookEvent.findUnique({
            where: { stripeEventId: event.id }
        });

        if (existingEvent?.processed) {
            console.log(`Event ${event.id} already processed, skipping`);
            return;
        }

        // Store webhook event for audit and replay
        const webhookEvent = await this.prisma.webhookEvent.upsert({
            where: { stripeEventId: event.id },
            create: {
                stripeEventId: event.id,
                eventType: event.type,
                payload: event as any,
                processed: false,
            },
            update: {}, // If exists but not processed, keep original
        });

        try {
            const data = event.data.object as any;

            // Process event in transaction
            await this.prisma.$transaction(async (tx) => {
                switch (event.type) {
                    case 'payment_intent.succeeded':
                        await this.handlePaymentIntentSucceeded(data, tx);
                        break;

                    case 'payment_intent.payment_failed':
                        await this.handlePaymentIntentFailed(data, tx);
                        break;

                    case 'charge.succeeded':
                        await this.handleChargeSucceeded(data, tx);
                        break;

                    case 'charge.refunded':
                        await this.handleChargeRefunded(data, tx);
                        break;

                    default:
                        console.log(`Unhandled event type ${event.type}`);
                }
            });

            // Mark as processed
            await this.prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: {
                    processed: true,
                    processedAt: new Date(),
                },
            });
        } catch (error) {
            // Log error but don't mark as processed (can retry)
            console.error(`Error processing webhook event ${event.id}:`, error);
            await this.prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: {
                    processingError: error.message,
                },
            });
            throw error; // Re-throw so Stripe knows to retry
        }
    }

    private async handlePaymentIntentSucceeded(data: any, tx: any): Promise<void> {
        // Update payment status in database
        const payment = await tx.payment.findUnique({
            where: { stripePaymentIntentId: data.id }
        });

        if (payment) {
            await tx.payment.update({
                where: { stripePaymentIntentId: data.id },
                data: {
                    status: 'succeeded',
                    completedAt: new Date(),
                },
            });
        } else {
            // Payment record doesn't exist yet, create it
            const user = await tx.user.findUnique({
                where: { stripeCustomerId: String(data.customer) }
            });

            if (user) {
                await tx.payment.create({
                    data: {
                        userId: user.id,
                        amount: data.amount,
                        currency: data.currency,
                        clientSecret: data.client_secret || "",
                        stripePaymentIntentId: data.id,
                        status: 'succeeded',
                        completedAt: new Date(),
                    },
                });
            }
        }

        // TODO: Business logic
        // - Send receipt email
        // - Update inventory
        // - Create order record
        console.log('PaymentIntent was successful ::: ', data.id);
    }

    private async handlePaymentIntentFailed(data: any, tx: any): Promise<void> {
        // Update payment status to failed
        await tx.payment.updateMany({
            where: { stripePaymentIntentId: data.id },
            data: {
                status: 'failed',
                failureReason: data.last_payment_error?.message || 'Payment failed',
            },
        });

        console.log('PaymentIntent failed ::: ', data.id);
    }

    private async handleChargeSucceeded(data: any, tx: any): Promise<void> {
        // Store charge details or mark as captured
        console.log('Charge Succeeded ::: ', data.id);
    }

    private async handleChargeRefunded(data: any, tx: any): Promise<void> {
        // Update payment status for full refunds
        if (data.refunded && data.amount_refunded === data.amount) {
            await tx.payment.updateMany({
                where: { stripePaymentIntentId: String(data.payment_intent) },
                data: {
                    status: 'refunded',
                    refundedAmount: data.amount_refunded,
                    refundedAt: new Date(),
                },
            });
        }
        console.log('Charge Fully Refunded ::: ', data.id);
    }
}
