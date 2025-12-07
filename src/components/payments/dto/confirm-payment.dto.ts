import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { MessageEnum } from '../../../common/enums/message.enum';

export class ConfirmPaymentDto {
    @ApiProperty({ example: MessageEnum.swaggerExample.PAYMENT_INTENT_ID, })
    @IsString()
    @IsNotEmpty()
    paymentIntentId: string;
}
