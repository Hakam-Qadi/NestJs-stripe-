import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentDto {
    @ApiProperty({ example: 1000 })
    @IsNumber()
    @Min(200)
    amount: number;

    @ApiProperty({ example: 'jod' })
    @IsOptional()
    @IsString()
    currency?: string = 'usd';

    @ApiProperty({ example: 'cus_TWaXQkywA4RZrO' })
    @IsString()
    customer: string;
}
