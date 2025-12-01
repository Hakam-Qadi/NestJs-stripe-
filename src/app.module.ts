import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { StripeModule } from './components/stripe/stripe.module';
import { AuthModule } from './components/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { BodyParserMiddleware } from './common/middlewares/body-parser.middleware';
import { UsersModule } from './components/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StripeModule,
    AuthModule,
    PrismaModule,
    UsersModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BodyParserMiddleware).forRoutes('*')
  }
}
