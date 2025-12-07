import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, } from "class-validator";
import { MessageEnum } from "../../../common/enums/message.enum";

export class CreateCustomerDto {
    @ApiProperty({
        example: MessageEnum.swaggerExample.CUSTOMER_ID,
    })
    @IsString()
    customerId?: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.PAYMENT_METHOD_ID,
    })
    @IsString()
    paymentMethodId: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.EMAIL,
    })
    @IsEmail({}, { message: MessageEnum.swaggerExample.VALIDATION.EMAIL })
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.NAME,
    })
    @IsNotEmpty()
    @IsOptional()
    name: string;
}