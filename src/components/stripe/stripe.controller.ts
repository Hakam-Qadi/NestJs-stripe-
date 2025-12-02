import { Body, Controller, Headers, Inject, Post, Query, Req, Res } from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('stripe')
export class StripeController {

    constructor(
        private stripeService: StripeService,
        private paymentsService: PaymentsService,
        private readonly prisma: PrismaService,
        @Inject('STRIPE_CLIENT') private stripe: Stripe
    ) { }

    // Create payment
    @Post('payment')
    async createIntent(@Body() dto: CreatePaymentDto) {
        return await this.stripeService.createPaymentIntent(dto);
    }

    // Confirm payments
    @Post('confirm')
    async confirm(@Body() body: ConfirmPaymentDto) {
        const intent = await this.stripeService.confirmPaymentIntent(body.paymentIntentId);

        if (intent) {
            await this.paymentsService.createPaymentsAtDb(intent)
        }
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

    @Post('attach')
    async attachCard(@Body() dto: CreateCustomerDto) {
        const paymentMethod = await this.stripeService.attachCardToCustomer(
            dto
        );

        return {
            message: "Card attached successfully",
            paymentMethod,
        };
    }

}