import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {


    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async createPaymentsAtDb(intent: Stripe.PaymentIntent) {
        try {
            const stripeCustomerId = intent.customer

            if (!stripeCustomerId) {
                throw new BadRequestException("PaymentIntent has no customer");
            }

            // Find the user using stripeCustomerId
            const user = await this.prisma.user.findUnique({
                where: { stripeCustomerId: String(stripeCustomerId) }
            });

            if (!user) {
                throw new BadRequestException("No user found for this Stripe customer");
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
