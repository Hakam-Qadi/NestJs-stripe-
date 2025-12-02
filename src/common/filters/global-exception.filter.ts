import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    console.error('[GlobalExceptionFilter] Error caught:', exception);

    // Handle Stripe card errors (declined, insufficient funds, etc.)
    if (exception?.type === 'card_error') {
      return response.status(402).json({
        success: false,
        errorType: exception.type,
        code: exception.code,
        decline_code: exception.decline_code,
        message: exception.message,
      });
    }

    // Handle other Stripe errors
    if (exception?.raw) {
      return response.status(400).json({
        success: false,
        errorType: exception.raw.type,
        code: exception.raw.code,
        message: exception.raw.message,
      });
    }

    // HttpException (Nest)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string' ? res : (res as any).message;

      return response.status(status).json({
        success: false,
        statusCode: status,
        message,
      });
    }

    // Default (unexpected)
    return response.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
