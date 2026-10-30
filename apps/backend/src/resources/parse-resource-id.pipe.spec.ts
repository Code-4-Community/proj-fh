import { BadRequestException } from '@nestjs/common';
import { ParseResourceIdPipe } from './parse-resource-id.pipe';

describe('ParseResourceIdPipe', () => {
  const pipe = new ParseResourceIdPipe();

  it('parses an integer string', () => {
    expect(pipe.transform('12')).toBe(12);
  });

  it.each(['abc', '1.5', '', '12abc'])(
    'rejects %p and echoes the value',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
      expect(() => pipe.transform(value)).toThrow(
        `Invalid resource id '${value}' in the URL`,
      );
    },
  );
});
