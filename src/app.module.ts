import { Module } from '@nestjs/common';
import { StripeModule } from './components/stripe/stripe.module';
import { AuthModule } from './components/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StripeModule,
    AuthModule,
    PrismaModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
