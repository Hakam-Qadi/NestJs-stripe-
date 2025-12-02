import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AttachCardDto {
    @ApiProperty({ example: 'pm_card_visa' })
    @IsString()
    paymentMethodId: string;

    @ApiProperty({ example: 'cus_TWaXQkywA4RZrO', })
    @IsString()
    customerId?: string;
}
