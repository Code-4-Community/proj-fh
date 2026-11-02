import { Category, ResourceStatus } from '../../types';

/**
 * Label shown for each category. Category values come from the backend
 * (e.g. food_access), so the UI maps them to readable labels.
 */
export const CATEGORY_LABEL: Record<Category, string> = {
  [Category.FOOD_ACCESS]: 'Food',
  [Category.HOUSING]: 'Housing',
  [Category.OTHER]: 'Other',
};

/**
 * CSS variant of the status badge, named by appearance rather than the status itself.
 */
export type ResourceStatusBadgeVariant = 'filled-light' | 'outlined';

/**
 * Badge variant for each resource status. Change a status's look here.
 */
export const RESOURCE_STATUS_BADGE_VARIANT: Record<
  ResourceStatus,
  ResourceStatusBadgeVariant
> = {
  [ResourceStatus.PENDING_REVIEW]: 'filled-light',
  [ResourceStatus.APPROVED_PUBLISHED]: 'filled-light',
  [ResourceStatus.NEEDS_CHANGES]: 'outlined',
  [ResourceStatus.REJECTED]: 'outlined',
  [ResourceStatus.ARCHIVED]: 'outlined',
};

/**
 * One option in a filter dropdown.
 */
export interface FilterOption<T extends string> {
  /** Value stored in filter state. */
  value: T;
  /** Text shown in the dropdown. */
  label: string;
}

/**
 * Options for the Category dropdown, in enum order.
 */
export const CATEGORY_OPTIONS: FilterOption<Category>[] = Object.values(
  Category,
).map((category) => ({ value: category, label: CATEGORY_LABEL[category] }));

/**
 * Options for the Status dropdown, in enum order.
 */
export const STATUS_OPTIONS: FilterOption<ResourceStatus>[] = Object.values(
  ResourceStatus,
).map((status) => ({ value: status, label: status }));

/**
 * A resource as displayed in one row of the review queue.
 */
export interface ReviewQueueResource {
  /** Identifies this specific resource; used to build its edit link. */
  resourceId: number;
  /** Name, shown in the Resource Name column and matched by search. */
  name: string;
  /** Every category the resource belongs to, shown as labels in the Category column. */
  categories: Category[];
  /** Name of the staff member who submitted it, shown in the Submitted By column. */
  submittedBy: string;
  /** When it was submitted, shown as mm/dd/yyyy in the Date Submitted column. */
  dateSubmitted: Date;
  /** Review status, shown as a badge in the Status column. */
  status: ResourceStatus;
}

/**
 * The current filter selections. An empty string means that filter is off (show all).
 */
export interface ReviewQueueFilters {
  /** Selected category, or '' for all. */
  category: Category | '';
  /** Selected status, or '' for all. */
  status: ResourceStatus | '';
  /** Search text matched against resource names. */
  search: string;
}

/**
 * Props for the review queue page.
 */
export interface ReviewQueuePageProps {
  /** Page title. */
  title: string;
  /** Short description shown under the title. */
  subtitle: string;
  /** Current filter selections. */
  filters: ReviewQueueFilters;
  /** Called with the full updated filters whenever any control changes. */
  onFiltersChange: (filters: ReviewQueueFilters) => void;
  /** Resources to show, already filtered. */
  resources: ReviewQueueResource[];
}

/**
 * Props for the page header.
 */
export interface ReviewQueueHeaderProps {
  /** Page title. */
  title: string;
  /** Short description shown under the title. */
  subtitle: string;
}

/**
 * Props for the filter bar.
 */
export interface ReviewQueueFilterBarProps {
  /** Current filter selections. */
  filters: ReviewQueueFilters;
  /** Called with the full updated filters whenever any control changes. */
  onFiltersChange: (filters: ReviewQueueFilters) => void;
}

/**
 * Props for a filter dropdown. T is the type of value it selects, e.g. Category.
 */
export interface ReviewQueueFilterSelectProps<T extends string> {
  /** Label shown above the dropdown. */
  label: string;
  /** Selected value, or '' when nothing is selected. */
  value: T | '';
  /** Options to choose from, in order. */
  options: FilterOption<T>[];
  /** Called with the newly selected value, or '' when the placeholder is chosen. */
  onChange: (value: T | '') => void;
}

/**
 * Props for the search bar.
 */
export interface ReviewQueueSearchBarProps {
  /** The current search text. */
  value: string;
  /** Called with the new text whenever the input changes. */
  onChange: (value: string) => void;
}

/**
 * Props for the resource table.
 */
export interface ReviewQueueTableProps {
  /** Resources to render, one per row, in order. */
  resources: ReviewQueueResource[];
}

/**
 * Props for a single row in the resource table.
 */
export interface ReviewQueueTableRowProps {
  /** The resource to render in this row. */
  resource: ReviewQueueResource;
}

/**
 * Props for the status badge.
 */
export interface ReviewQueueStatusBadgeProps {
  /** The status to render. */
  status: ResourceStatus;
}