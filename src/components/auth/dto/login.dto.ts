import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";
import { MessageEnum } from "../../../common/enums/message.enum";

export class LoginDto {
    @ApiProperty({
        example: MessageEnum.swaggerExample.EMAIL,
        uniqueItems: true,
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: MessageEnum.swaggerExample.PASSWORD,
        minLength: 8,
    })
    @IsNotEmpty()
    password: string;
}