import { Category, County } from '../types';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Filters for retrieving resources by query.
 *
 * All fields are optional. Only the fields provided are applied, and a resource
 * must match all of them to be returned.
 */
export class FindResourceQueryDTO {
  /** Matches resources that belong to at least one of these categories.
   * E.g. [Category.FOOD_ACCESS], [Category.HOUSING, Category.OTHER] */
  @IsOptional()
  @IsArray()
  @IsEnum(Category, { each: true })
  category?: Category[];

  /** E.g. County.SUFFOLK, County.MIDDLESEX */
  @IsOptional()
  @IsEnum(County)
  county?: County;

  /** E.g. '02115', '01960' */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  zip_code?: string;
}
