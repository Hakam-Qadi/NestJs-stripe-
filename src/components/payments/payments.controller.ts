import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { MessageEnum } from '../../common/enums/message.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@Controller('stripe/payments')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    // Create payment
    @Post('create')
    async createIntent(@Body() dto: CreatePaymentDto) {
        return await this.paymentsService.createPaymentIntent(dto);
    }

    // Confirm payments
    @Post('confirm')
    async confirm(@Body() body: ConfirmPaymentDto) {
        const intent = await this.paymentsService.confirmPaymentIntent(body.paymentIntentId);

        if (intent) {
            await this.paymentsService.createPaymentsAtDb(intent)
        }
        return {
            message: MessageEnum.error.PAYMENT_INTENT_CONFIRMED,
            paymentIntent: intent,
        };
    }

    @Post('refund')
    async refundPayment(
        @Query('paymentId') paymentId: string,
        @Query('amount') amount?: number
    ) {
        const refund = await this.paymentsService.refundPayment(paymentId, amount);

        return {
            message: MessageEnum.error.PAYMENT_REFUNDED,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
        };
    }
}
