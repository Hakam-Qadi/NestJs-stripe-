import { Body, Controller, Inject, Post } from "@nestjs/common";
import Stripe from "stripe";
import { CreateCustomerDto } from "../customers/dto/create-customer.dto";
import { CardsService } from "./cards.service";
import { AttachCardDto } from "./dto/attach-card.dto";
import { MessageEnum } from "../../common/enums/message.enum";

@Controller('stripe')

export class CustomersController {

    constructor(
        private cardsService: CardsService,
    ) { }

    @Post('attach')
    async attachCard(@Body() dto: AttachCardDto) {
        const paymentMethod = await this.cardsService.attachCardToCustomer(
            dto
        );
        return {
            message: MessageEnum.error.CARD_ATTACHED_SUCCESSFULLY,
            paymentMethod,
        };
    }
}