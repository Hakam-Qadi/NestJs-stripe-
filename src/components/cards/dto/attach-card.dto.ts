import { ApiProperty } from '@nestjs/swagger';
import { IsString, } from 'class-validator';
import { MessageEnum } from '../../../common/enums/message.enum';

export class AttachCardDto {
    @ApiProperty({ example: MessageEnum.swaggerExample.PAYMENT_METHOD_ID, })
    @IsString()
    paymentMethodId: string;

    @ApiProperty({ example: MessageEnum.swaggerExample.CUSTOMER_ID, })
    @IsString()
    customerId?: string;
}
