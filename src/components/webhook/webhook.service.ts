import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { serviceConfig } from '../../config/env.config';
import { MessageEnum } from '../../common/enums/message.enum';

@Injectable()
export class WebhookService {
    constructor(
        @Inject('STRIPE_CLIENT') private stripe: Stripe
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
        const data = event.data.object as any;

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(data);
                break;

            case 'charge.succeeded':
                await this.handleChargeSucceeded(data);
                break;

            case 'charge.refunded':
                await this.handleChargeRefunded(data);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    }

    private async handlePaymentIntentSucceeded(data: any): Promise<void> {
        // Create order
        // Mark as paid
        // Reduce inventory
        // Send receipt email
        console.log('PaymentIntent was successful ::: ', data.id);
    }

    private async handleChargeSucceeded(data: any): Promise<void> {
        // Store charge details or mark as captured
        console.log('Charge Succeeded ::: ', data.id);
    }

    private async handleChargeRefunded(data: any): Promise<void> {
        // Mark order as refunded
        console.log('Charge Fully Refunded ::: ', data.id);
    }
}
