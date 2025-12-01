import { Controller } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }


}
