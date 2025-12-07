import { Controller, Headers, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';
import { MessageEnum } from '../../common/enums/message.enum';

@Controller('stripe')
export class StripeWebhookController {
    constructor(
        private readonly webhookService: WebhookService
    ) { }

    @Post('webhook')
    async handleWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('stripe-signature') sigHeader: string
    ) {
        const rawBody = (req as any).rawBody;

        try {
            const event = this.webhookService.verifyWebhookSignature(rawBody, sigHeader);
            await this.webhookService.handleWebhookEvent(event);
            return res.json({ received: true });
        } catch (err) {
            console.error(MessageEnum.error.WEBHOOK_SIGNATURE_FAILED, err.message);
            return res.status(400).send(MessageEnum.error.WEBHOOK_SIGNATURE_FAILED);
        }
    }
}
