import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    Matches
} from "class-validator";
import { MessageEnum } from "../../../common/enums/message.enum";

export class RegisterDto {


    @ApiProperty({
        example: MessageEnum.swaggerExample.NAME,
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2, { message: MessageEnum.swaggerExample.VALIDATION.NAME_MIN_LENGTH })
    @MaxLength(50, { message: MessageEnum.swaggerExample.VALIDATION.NAME_MAX_LENGTH })
    name: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.EMAIL,
        uniqueItems: true,
    })
    @IsEmail({}, { message: MessageEnum.swaggerExample.VALIDATION.EMAIL })
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.PASSWORD,
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: MessageEnum.swaggerExample.VALIDATION.PASSWORD_MIN_LENGTH })
    @MaxLength(100, { message: MessageEnum.swaggerExample.VALIDATION.PASSWORD_MAX_LENGTH })
    @Matches(/(?=.*[A-Z])/, { message: MessageEnum.swaggerExample.VALIDATION.PASSWORD_UPPERCASE })
    @Matches(/(?=.*[a-z])/, { message: MessageEnum.swaggerExample.VALIDATION.PASSWORD_LOWERCASE })
    @Matches(/(?=.*\d)/, { message: MessageEnum.swaggerExample.VALIDATION.PASSWORD_NUMBER })
    @Matches(/(?=.*[@$!%*?&])/, { message: MessageEnum.swaggerExample.VALIDATION.PASSWORD_SPECIAL_CHAR })
    password: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.PAYMENT_METHOD_ID,
    })
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;
}
