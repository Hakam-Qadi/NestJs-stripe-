import { Body, Controller, Post } from "@nestjs/common";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CustomersService } from "./customers.service";
import { MessageEnum } from "../../common/enums/message.enum";

@Controller('stripe')

export class CustomersController {

    constructor(
        private customersService: CustomersService,
    ) { }

    @Post('create')
    async createCustomer(@Body() dto: CreateCustomerDto) {
        const customer = await this.customersService.createCustomer(dto);
        return {
            message: MessageEnum.error.USER_CREATED,
            customer,
        };
    }
}