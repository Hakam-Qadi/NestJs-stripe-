import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import Stripe from "stripe";
import { CreateCustomerDto } from "./dto/create-customer.dto";

@Injectable()

export class CustomersService {
    constructor(
        @Inject('STRIPE_CLIENT') private stripe: Stripe,
        private readonly prisma: PrismaService,
    ) { }


    async createCustomer(dto: CreateCustomerDto) {
        // Check if customer already exists in Stripe by email
        const existingCustomers = await this.stripe.customers.list({
            email: dto.email,
            limit: 1,
        });

        if (existingCustomers.data.length > 0) {
            // Update user in database with existing Stripe customer ID
            await this.prisma.user.update({
                where: { email: dto.email },
                data: { stripeCustomerId: existingCustomers.data[0].id }
            });
            return existingCustomers.data[0];
        }

        // Create new customer if not exists
        const customer = await this.stripe.customers.create({
            email: dto.email,
            name: dto.name,
            payment_method: dto.paymentMethodId
        });
        return customer;
    }

    async deleteCustomer(customerId: string) {
        return await this.stripe.customers.del(customerId);
    }

}