/**
 * Frontend copies of the backend entity types.
 *
 * These mirror the TypeORM entities in apps/backend without the decorators,
 * describing the JSON the API returns. Keep them in sync when the backend
 * entities change.
 */

/**
 * Represents the broad classification(s) a Resource can belong to.
 * A Resource can belong to more than one Category (e.g. an organization that offers both food and housing assistance).
 */
export enum Category {
  FOOD_ACCESS = 'food_access',
  HOUSING = 'housing',
  OTHER = 'other',
}

/**
 * Represents the Massachusetts county a Resource is located in.
 * Used to power the county filter on the client.
 */
export enum County {
  SUFFOLK = 'Suffolk',
  MIDDLESEX = 'Middlesex',
  NORFOLK = 'Norfolk',
  ESSEX = 'Essex',
  WORCESTER = 'Worcester',
  PLYMOUTH = 'Plymouth',
  HAMPDEN = 'Hampden',
  HAMPSHIRE = 'Hampshire',
  BERKSHIRE = 'Berkshire',
  BARNSTABLE = 'Barnstable',
  BRISTOL = 'Bristol',
  DUKES = 'Dukes',
  NANTUCKET = 'Nantucket',
  FRANKLIN = 'Franklin',
}

/**
 * Represents a Resource entity.
 *
 * This entity is used to store data sources like food pantries or housing programs.
 */
export class Resource {
  resource_id!: number;
  score_id!: number;
  name!: string;
  category!: Category[];
  description?: string;
  address?: string;
  county!: County;
  zip_code!: string;
  phone?: string;
  email?: string;
  website?: string;
  eligibility?: string;
  last_verified_date!: Date;
  vetting_status!: string;
  reviewer_notes?: string;
  tags!: number[];
}

/**
 * Represents a Score entity in the system.
 * This entity is used to store and manage information about scores associated with various resources.
 */
export class Score {
  score_id!: number;
}

/**
 * Represents a Tag entity in the system.
 * This entity is used to store and manage information about tags that can be associated with various resources.
 */
export class Tag {
  tag_id!: number;
  category!: Category;
  label!: string;
  slug!: string;
}
