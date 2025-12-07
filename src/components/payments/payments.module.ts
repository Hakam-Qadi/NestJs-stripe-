import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtModule } from '@nestjs/jwt';
import { serviceConfig } from '../../config/env.config';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    JwtModule.register({
      secret: serviceConfig.service.jwtSecret,
      signOptions: { expiresIn: serviceConfig.service.jwtExpiry },
    }),
    StripeModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
