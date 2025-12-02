import { Controller, Headers, Inject, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { serviceConfig } from '../../config/env.config';
import Stripe from 'stripe';

@Controller('stripe')
export class StripeWebhookController {
    constructor(
        @Inject('STRIPE_CLIENT') private stripe: Stripe
    ) { }

    @Post('webhook')
    async handleWebhook(@Req() req: Request, @Res() res: Response, @Headers('stripe-signature') sigHeader: string) {
        const webhookSecret = serviceConfig.stripe.webhookKey
        let event: Stripe.Event;
        const rawBody = (req as any).rawBody;

        try {
            event = this.stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
        } catch (err) {
            console.error('Webhook signature verification failed.', err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        const data = event.data.object as any;
        // Handle event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                // Create order
                // Mark as paid
                // Reduce inventory
                // Send receipt email

                console.log('PaymentIntent was successful ::: ', data.id);
                break;

            case 'charge.succeeded': {
                // store charge details or mark as captured

                console.log('Charge Succeeded ::: ', data.id);
                break;
            }

            case 'charge.refunded': {
                // Mark order as refunded

                console.log('Charge Fully Refunded ::: ', data.id);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    }


}
