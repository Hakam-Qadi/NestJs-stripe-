import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginDto {
    @ApiProperty({
        example: 'john@example.com',
        uniqueItems: true,
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'StrongPass@123',
        minLength: 8,
    })
    @IsNotEmpty()
    password: string;
}