import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    Matches
} from "class-validator";

export class RegisterDto {


    @ApiProperty({
        example: 'John Doe',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    @MaxLength(50, { message: 'Name must be less than 50 characters' })
    name: string;

    @ApiProperty({
        example: 'john@example.com',
        uniqueItems: true,
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'StrongPass@123',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(100, { message: 'Password must be less than 100 characters' })
    @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
    @Matches(/(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter' })
    @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
    @Matches(/(?=.*[@$!%*?&])/, { message: 'Password must contain at least one special character (@$!%*?&)' })
    password: string;

    @ApiProperty({
        // example: 'pm_1SZUubE9Ea2k0MpMFpZiBSgl',
        example: 'pm_card_visa',
    })
    @IsString()
    paymentMethodId: string;
}
