import 'dotenv/config';
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();


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
                    clientSecret: "pi_test_secret_1"
                },
                {
                    amount: 2500,
                    currency: "usd",
                    clientSecret: "pi_test_secret_2"
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
                    clientSecret: "pi_test_secret_3"
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
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await prisma.user.create({
                data: {
                    name: user.name,
                    email: user.email,
                    password: hashedPassword,
                    stripeCustomerId: user.stripeCustomerId,
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