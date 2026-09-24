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
}
