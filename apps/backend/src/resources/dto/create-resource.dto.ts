import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { Category, County } from '../types';

/**
 * The request body for creating a new Resource.
 */
export class CreateResourceDto {
  /**
   * The name of the Resource.
   *
   * E.g. 'Greater Boston Food Bank'
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * The category (or categories) the Resource belongs to. At least one is required.
   *
   * E.g. [Category.FOOD_ACCESS]
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Category, { each: true })
  category!: Category[];

  /**
   * The Massachusetts county the Resource is located in.
   *
   * E.g. County.SUFFOLK
   */
  @IsEnum(County)
  county!: County;

  /**
   * The ZIP code of the Resource's location, in 5-digit or ZIP+4 format.
   *
   * E.g. '02115', '02115-1234'
   */
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'zip_code must be a 5-digit or ZIP+4 code',
  })
  zip_code!: string;

  /**
   * A free-text description of the Resource.
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * The street address of the Resource's location.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  /**
   * The contact phone number for the Resource.
   */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /**
   * The contact email address for the Resource.
   */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  /**
   * The website URL for the Resource.
   */
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  website?: string;

  /**
   * A written description of who is eligible to use the Resource.
   */
  @IsOptional()
  @IsString()
  eligibility?: string;
}
