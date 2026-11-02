import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Parses the `:id` URL param into an integer. On failure the 400 message echoes
 * the offending value so the caller can see what was wrong.
 */
@Injectable()
export class ParseResourceIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^-?\d+$/.test(value)) {
      throw new BadRequestException(
        `Invalid resource id '${value}' in the URL: id must be an integer (for example /resources/12).`,
      );
    }
    return Number(value);
  }
}
