import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCustomerDto {
    @ApiProperty({
        example: 'cus_TWaXQkywA4RZrO',
    })
    @IsString()
    customerId?: string;

    @ApiProperty({
        // example: 'pm_1SZUubE9Ea2k0MpMFpZiBSgl',
        example: 'pm_card_visa',
    })
    @IsString()
    paymentMethodId: string;

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