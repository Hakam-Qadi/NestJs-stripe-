import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { AttachCardDto } from "./dto/attach-card.dto";

@Injectable()
export class CardsService {
    constructor(
        @Inject('STRIPE_CLIENT') private stripe: Stripe,
    ) { }


    async attachCardToCustomer(dto: AttachCardDto) {
        try {
            // Attach card
            const paymentMethod = await this.stripe.paymentMethods.attach(
                dto.paymentMethodId,
                { customer: dto.customerId || "" }
            );

            // Set as default
            await this.stripe.customers.update(dto.customerId || "", {
                invoice_settings: { default_payment_method: dto.paymentMethodId },
            });

            return paymentMethod;

        } catch (error) {
            console.error("Error attaching card:", error);
            throw new BadRequestException(error.message);
        }
    }

}