import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmPaymentDto {
    @ApiProperty({ example: 'pi_3Ox12345ABCxyz', description: 'Stripe PaymentIntent ID' })
    @IsString()
    @IsNotEmpty()
    paymentIntentId: string;
}
