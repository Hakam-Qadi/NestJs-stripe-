import { Body, Controller, Headers, Inject, Post, Query, Req, Res } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { serviceConfig } from 'src/config/env.config';
import Stripe from 'stripe';
import { Request, Response } from 'express';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('stripe')
export class StripeController {

    constructor(
        private stripeService: StripeService,
        @Inject('STRIPE_CLIENT') private stripe: Stripe
    ) { }

    @Post('payment')
    async createIntent(@Body() body: CreatePaymentDto) {
        return await this.stripeService.createPaymentIntent(
            body.amount,
            body.currency ?? 'usd',
            body.customer,
        );
    }

    @Post('webhook')
    async handleWebhook(@Req() req: Request, @Res() res: Response, @Headers('stripe-signature') sigHeader: string) {
        const webhookSecret = serviceConfig.stripe.webhookKey
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(req.body, sigHeader, webhookSecret);
        } catch (err) {
            console.error('Webhook signature verification failed.', err);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log('PaymentIntent was successful!', paymentIntent.id);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    }

    @Post('confirm')
    async confirm(@Body() body: ConfirmPaymentDto) {
        const intent = await this.stripeService.confirmPaymentIntent(body.paymentIntentId);
        return {
            message: 'PaymentIntent confirmed',
            paymentIntent: intent,
        };
    }

    @Post('customer')
    async createCustomer(@Body() dto: CreateCustomerDto) {
        const customer = await this.stripeService.createCustomer(dto);
        return {
            message: 'Customer created successfully',
            customer,
        };
    }

    @Post('refund')
    async refundPayment(@Query('paymentId') paymentId: string) {
        const refund = await this.stripeService.refundPayment(paymentId);

        return {
            message: 'Refund payment successfully',
            amount: refund.amount,
            currency: refund.currency,
        };
    }
}