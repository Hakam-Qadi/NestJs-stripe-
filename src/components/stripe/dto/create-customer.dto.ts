import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCustomerDto {
    @ApiProperty({
        example: 'john@example.com',
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'John Doe',
    })
    @IsNotEmpty()
    @IsOptional()
    name: string;
}