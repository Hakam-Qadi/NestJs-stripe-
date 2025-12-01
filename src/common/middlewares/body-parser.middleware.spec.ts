import { BodyParserMiddleware } from './body-parser.middleware';

describe('BodyParserMiddleware', () => {
  it('should be defined', () => {
    expect(new BodyParserMiddleware()).toBeDefined();
  });
});
