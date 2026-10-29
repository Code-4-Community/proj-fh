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
 * The question a Tag answers on the vetting forms. Each Tag belongs to exactly one TagGroup.
 */
export enum TagGroup {
  POPULATION = 'population',
  INTAKE_PROCESS = 'intake_process',
  REQUIRED_DOCUMENTATION = 'required_documentation',
  CONTACT_METHOD = 'contact_method',
  RED_FLAG = 'red_flag',
  FOOD_ASSISTANCE_TYPE = 'food_assistance_type',
  FOOD_TYPE = 'food_type',
  PRICING = 'pricing',
  FREQUENCY = 'frequency',
  ESTIMATED_WAIT_TIME = 'estimated_wait_time',
  HOUSING_SERVICE_TYPE = 'housing_service_type',
  ACCESSIBILITY = 'accessibility',
  CULTURAL_COMPETENCY = 'cultural_competency',
  PROGRAM_OBSERVATION = 'program_observation',
}

/**
 * TagGroups where a Resource may have only one Tag. Every other group is multi-select.
 */
export const SINGLE_SELECT_TAG_GROUPS: ReadonlySet<TagGroup> = new Set([
  TagGroup.FREQUENCY,
  TagGroup.ESTIMATED_WAIT_TIME,
]);
