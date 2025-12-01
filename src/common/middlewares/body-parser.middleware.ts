import { Injectable, NestMiddleware } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class BodyParserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {

    if (req.originalUrl === '/stripe/webhook') {
      // Parse RAW body for Stripe signature verification
      bodyParser.raw({ type: '*/*' })(req, res, next);
    } else {
      // Normal JSON parsing
      bodyParser.json()(req, res, next);
    }
  }
}
