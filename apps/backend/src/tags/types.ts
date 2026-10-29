/**
 * Which resources a Tag applies to: one resource Category, or COMMON for tags valid on every resource.
 * The first three values match the resource Category enum values.
 */
export enum TagCategory {
  FOOD_ACCESS = 'food_access',
  HOUSING = 'housing',
  OTHER = 'other',
  COMMON = 'common',
}

/**
 * Whether a resource may have one or several Tags from a TagGroup.
 */
export enum TagSelection {
  SINGLE = 'single',
  MULTI = 'multi',
}
