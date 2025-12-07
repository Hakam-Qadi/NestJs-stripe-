import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";
import { MessageEnum } from "../../../common/enums/message.enum";

export class CreatePaymentDto {
    @ApiProperty({ example: MessageEnum.swaggerExample.AMOUNT, })
    @IsNumber()
    @Min(MessageEnum.swaggerExample.MIN_AMOUNT, { message: MessageEnum.swaggerExample.VALIDATION.AMOUNT_MIN_LENGTH })
    amount: number;

    @ApiProperty({ example: MessageEnum.swaggerExample.CURRENCY })
    @IsOptional()
    @IsString()
    currency?: string = MessageEnum.swaggerExample.DEFAULT_CURRENCY;

    @ApiProperty({ example: MessageEnum.swaggerExample.CUSTOMER_ID, })
    @IsString()
    customer: string;
}
