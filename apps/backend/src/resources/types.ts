/**
 * Represents the broad classification a Resource belongs to.
 * Each Resource has exactly one Category, which is also the form that was used to vet it.
 * See docs/adding-a-resource-category.md for how to add a new Category.
 */
export enum Category {
  FOOD_ACCESS = 'food_access',
  HOUSING = 'housing',
  OTHER = 'other',
}

/**
 * The Resource contact fields whose visibility on the public website can be chosen.
 * A field that is not listed in Resource.public_fields is non-public.
 */
// TODO REVIEW THIS AFTER CLIENT MEETING 10.30
export enum PublicField {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  ADDRESS = 'address',
}

/**
 * How quickly the organization responded to outreach (vetting form Section 3).
 */
export enum ResponseTime {
  SAME_DAY = 'same_day',
  ONE_TO_THREE_DAYS = '1_3_days',
  ONE_WEEK_PLUS = '1_week_plus',
  NO_RESPONSE = 'no_response',
}

/**
 * A yes / no / maybe answer.
 */
export enum YesNoMaybe {
  YES = 'yes',
  NO = 'no',
  MAYBE = 'maybe',
}

/**
 * Where a Resource is in the review workflow.
 * SENT_BACK_FOR_REVIEW and NEEDS_CHANGES are both kept for now until one is chosen.
 */
// TODO REVIEW THIS AFTER CLIENT MEETING 10.30
export enum ReviewStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED_PUBLISHED = 'approved_published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  SENT_BACK_FOR_REVIEW = 'sent_back_for_review',
  NEEDS_CHANGES = 'needs_changes',
}

/**
 * The reviewer's answer to "Would you feel comfortable referring Fenway Health patients here?"
 * (vetting form Section 7).
 */
export enum Recommendation {
  STRONGLY_RECOMMEND = 'strongly_recommend',
  RECOMMEND_MINOR_CONCERNS = 'recommend_minor_concerns',
  RECOMMEND_WITH_CAUTION = 'recommend_with_caution',
  NOT_RECOMMENDED = 'not_recommended',
  NEEDS_REVIEW = 'needs_review',
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
