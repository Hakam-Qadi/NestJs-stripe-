import { CustomersModule } from '../customers/customers.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { LocalStrategy } from '../../common/strategies/local.strategy';
import { StripeModule } from '../stripe/stripe.module';
import { serviceConfig } from '../../config/env.config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: () => ({
        secret: serviceConfig.service.jwtSecret,
        signOptions: { expiresIn: serviceConfig.service.jwtExpiry },
      }),
    }),
    PassportModule,
    ConfigModule,
    StripeModule,
    CustomersModule,
  ],


  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule { }
