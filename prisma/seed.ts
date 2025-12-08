import 'dotenv/config';
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from 'bcrypt';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: process.env.API_VERSION as Stripe.LatestApiVersion,
});


async function main() {
    console.log("Seeding database...");

    const users = [
        {
            name: "John Doe",
            email: "john@example.com",
            password: "StrongPass@123",
            stripeCustomerId: null,
            payments: [
                {
                    amount: 1000,
                    currency: "usd",
                    clientSecret: "pi_test_secret_1",
                    stripePaymentIntentId: "pi_seed_1",
                    status: "succeeded"
                },
                {
                    amount: 2500,
                    currency: "usd",
                    clientSecret: "pi_test_secret_2",
                    stripePaymentIntentId: "pi_seed_2",
                    status: "pending"
                }
            ]
        },
        {
            name: "Sarah Connor",
            email: "sarah@example.com",
            password: "StrongPass@123",
            stripeCustomerId: null,
            payments: [
                {
                    amount: 5000,
                    currency: "usd",
                    clientSecret: "pi_test_secret_3",
                    stripePaymentIntentId: "pi_seed_3",
                    status: "succeeded"
                }
            ]
        },
        {
            name: "Hakam Qadi",
            email: "hakam@example.com",
            password: "StrongPass@123",
            stripeCustomerId: null,
            payments: []
        }
    ];

    for (const user of users) {
        const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
        });
        if (existingUser) {
            console.log(`User with email ${user.email} exists — skipping.`);
        } else {
            // Create Stripe customer first
            let stripeCustomerId: string | null = null;
            try {
                const stripeCustomer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                });
                stripeCustomerId = stripeCustomer.id;
                console.log(`Stripe customer created for ${user.email}: ${stripeCustomerId}`);
            } catch (error) {
                console.error(`Failed to create Stripe customer for ${user.email}:`, error.message);
            }

            // Create user in database
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await prisma.user.create({
                data: {
                    name: user.name,
                    email: user.email,
                    password: hashedPassword,
                    stripeCustomerId: stripeCustomerId,
                    payments: {
                        create: user.payments
                    }
                }
            });
            console.log(`User ${user.email} inserted successfully.`);
        }
    }
    console.log("Seeding completed.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});