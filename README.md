# NestJS Stripe Payment Integration

A production-ready NestJS application integrated with Stripe for handling payments, refunds, and webhook events with enterprise-level reliability.

## 🎯 Features

- **Payment Processing** - Create and confirm payment intents
- **Customer Management** - Stripe customer creation and management
- **Card Management** - Attach payment methods to customers
- **Refund Processing** - Full and partial refund support
- **Webhook Integration** - Transactional event processing with idempotency
- **Authentication** - JWT-based auth with refresh tokens
- **Database** - PostgreSQL with Prisma ORM
- **Payment Tracking** - Complete payment lifecycle management
- **Audit Trail** - Comprehensive webhook event logging

## 🏗️ Architecture Highlights

### Payment Idempotency
- Prevents duplicate payment intents within 5-minute window
- Stripe-level idempotency keys
- Database-level duplicate detection

### Transactional Webhooks
- Idempotent event processing (same event never processed twice)
- Atomic database operations (all changes commit together or none)
- Full audit trail with replay capability
- Automatic retry handling for failed events

### Error Recovery
- Compensation logic for failed operations
- Automatic Stripe customer cleanup on registration failure
- Payment status tracking with failure reasons

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Stripe account ([Sign up here](https://stripe.com))

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Hakam-Qadi/NestJs-stripe-.git
cd NestJs-stripe-
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the following variables:

```env
# Application
NODE_ENV=development
APP_NAME=Stripe
APP_VERSION=1.0.0

# Database
DATABASE_URL="postgres://postgres:password@localhost:5432/stripedb"

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=1h
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRY=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
API_VERSION=2025-11-17.clover
```

**Get your Stripe keys:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your Secret key and Publishable key
3. For webhook secret, see [Webhook Setup](#webhook-setup) section

### 4. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed database with test data (creates Stripe customers)
npm run seed
```

The seed script creates:
- 3 test users with hashed passwords
- Associated Stripe customers
- Sample payment records

### 5. Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Swagger UI
Access interactive API documentation at: `http://localhost:3000/api/docs`

### Authentication Endpoints

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass@123"
}
```

Creates a user and automatically creates a Stripe customer.

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "StrongPass@123"
}
```

Returns JWT access token and refresh token.

### Payment Endpoints

#### Create Payment Intent
```http
POST /stripe/payments/create
Content-Type: application/json

{
  "customer": "cus_xxx",
  "amount": 1000,
  "currency": "usd"
}
```

Creates a payment intent. Returns `clientSecret` for frontend confirmation.

**Idempotency:** Multiple identical requests within 5 minutes return the same payment intent.

#### Confirm Payment
```http
POST /stripe/payments/confirm
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx"
}
```

Confirms the payment using a test card.

#### Refund Payment
```http
POST /stripe/payments/refund?paymentId=pi_xxx&amount=500
```

Refunds a payment (full or partial).

**Parameters:**
- `paymentId` (required) - Stripe payment intent ID
- `amount` (optional) - Amount to refund in cents. Omit for full refund.

### Customer Endpoints

#### Create Customer
```http
POST /stripe/customers/create
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "Customer Name"
}
```

### Card Endpoints

#### Attach Card
```http
POST /stripe/cards/attach
Content-Type: application/json

{
  "customerId": "cus_xxx",
  "paymentMethodId": "pm_card_visa"
}
```

## 🧪 Testing with Stripe

### Test Cards

Use these test card numbers in Stripe's test mode:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires authentication |

**Test Payment Method IDs:**
- `pm_card_visa` - Successful payment
- `pm_card_chargeDeclined` - Declined payment

### Webhook Testing

#### Local Testing with Stripe CLI

1. **Install Stripe CLI**
   ```bash
   # Windows (using Scoop)
   scoop install stripe
   
   # macOS
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**
   ```bash
   stripe listen --forward-to localhost:3000/stripe/webhook
   ```
   
   Copy the webhook signing secret (`whsec_xxx`) and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

4. **Trigger test events**
   ```bash
   # Successful payment
   stripe trigger payment_intent.succeeded
   
   # Failed payment
   stripe trigger payment_intent.payment_failed
   
   # Refund
   stripe trigger charge.refunded
   ```

### Payment Flow Testing

**Complete payment flow:**

1. Create a payment intent:
```bash
curl -X POST http://localhost:3000/stripe/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "cus_xxx",
    "amount": 1000,
    "currency": "usd"
  }'
```

2. Confirm the payment:
```bash
curl -X POST http://localhost:3000/stripe/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_xxx"
  }'
```

3. Check payment status in database or Stripe Dashboard

## 🗄️ Database Schema

### Key Models

**User**
- Stores user authentication data
- Links to Stripe customer via `stripeCustomerId`

**Payment**
- Tracks payment lifecycle: `pending` → `succeeded`/`failed`
- Supports refund tracking with `refundedAmount`
- Stores `failureReason` for failed payments

**WebhookEvent**
- Ensures idempotent webhook processing
- Stores full event payload for replay
- Tracks processing status and errors

### Prisma Studio

View and manage your database:
```bash
npx prisma studio
```

Opens at `http://localhost:5555`

## 🔒 Security Best Practices

1. **Environment Variables** - Never commit `.env` files
2. **Webhook Verification** - All webhooks verify Stripe signatures
3. **Password Hashing** - bcrypt with salt rounds
4. **JWT Tokens** - Secure token generation with refresh mechanism
5. **Rate Limiting** - Consider adding rate limiting for production

## 📁 Project Structure

```
src/
├── common/               # Shared utilities
│   ├── enums/           # Message enums
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards (JWT, Local)
│   ├── interceptors/    # Response interceptor
│   ├── middlewares/     # Body parser for webhooks
│   └── strategies/      # Passport strategies
├── components/
│   ├── auth/            # Authentication (register, login)
│   ├── cards/           # Card management
│   ├── customers/       # Stripe customer operations
│   ├── payments/        # Payment intent operations
│   ├── stripe/          # Stripe client configuration
│   └── webhook/         # Webhook event processing
├── config/              # Environment & validation config
├── generated/           # Prisma generated client
└── main.ts              # Application entry point

prisma/
├── migrations/          # Database migrations
├── schema.prisma        # Database schema
└── seed.ts              # Database seeding script
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run start:dev        # Start with hot reload
npm run start:debug      # Start with debugger

# Build
npm run build            # Build for production

# Database
npm run migrate:dev      # Run migrations
npm run seed             # Seed database

# Testing
npm run test             # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:cov         # Test coverage

# Code Quality
npm run lint             # Lint code
npm run format           # Format code with Prettier
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
# Windows
Get-Service -Name postgresql*

# Verify connection
psql -U postgres -d stripedb
```

### Webhook Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
- Check raw body parsing middleware is configured
- Verify webhook endpoint is `/stripe/webhook`

### Payment Creation Returns Duplicate
- This is intentional! Idempotency prevents duplicate charges
- Check for pending payments in last 5 minutes
- Different amounts will create new payment intents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is [MIT licensed](LICENSE).

## 🙏 Acknowledgments

Built with:
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Stripe](https://stripe.com/) - Payment processing platform
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [PostgreSQL](https://www.postgresql.org/) - Powerful open-source database

---

**Note:** This is a development/testing setup. For production deployment:
- Use environment-specific configurations
- Enable HTTPS
- Add rate limiting
- Implement proper logging
- Set up monitoring and alerting
- Review Stripe's production checklist

## 🚀 Quick Start Commands

```bash
# Complete setup from scratch
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma migrate dev
npm run seed
npm run start:dev
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
