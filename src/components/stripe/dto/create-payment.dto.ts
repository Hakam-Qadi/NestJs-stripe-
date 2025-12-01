import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentDto {
    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(200)
    amount: number;

    @ApiProperty({ example: 'jod' })
    @IsOptional()
    @IsString()
    currency?: string = 'usd';
}
