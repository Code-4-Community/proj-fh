import { Category, County } from '../types';

/**
 * The request body for creating a new Resource.
 *
 * Server-managed fields (resource_id, score_id, tags, last_verified_date, vetting_status, reviewer_notes)
 * are intentionally excluded and set by the ResourcesService.
 */
export interface CreateResourceDto {
  /** E.g. 'Greater Boston Food Bank' */
  name: string;
  /** At least one is required. E.g. [Category.FOOD_ACCESS] */
  category: Category[];
  /** E.g. County.SUFFOLK */
  county: County;
  /** 5-digit or ZIP+4 format. E.g. '02115', '02115-1234' */
  zip_code: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  eligibility?: string;
}
