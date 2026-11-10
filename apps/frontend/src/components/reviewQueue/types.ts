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
export type ResourceStatusBadgeVariant = 'filled-light' | 'outlined' | 'filled-dark';

/**
 * Text shown in the status badge when the backend sends a status the frontend doesn't recognize.
 */
export const UNKNOWN_STATUS_LABEL = 'Unknown';

/**
 * Badge variant for a status the frontend doesn't recognize.
 */
export const UNKNOWN_STATUS_BADGE_VARIANT: ResourceStatusBadgeVariant = 'outlined';

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
  [ResourceStatus.REJECTED]: 'filled-dark',
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
 * Statuses that are never shown in the review queue.
 */
export const REVIEW_QUEUE_HIDDEN_STATUSES: ResourceStatus[] = [
  ResourceStatus.REJECTED,
  ResourceStatus.ARCHIVED,
];

/**
 * Options for the Status dropdown, in enum order. Hidden statuses are left out,
 * since selecting them could never match a row.
 */
export const STATUS_OPTIONS: FilterOption<ResourceStatus>[] = Object.values(
  ResourceStatus,
)
  .filter((status) => !REVIEW_QUEUE_HIDDEN_STATUSES.includes(status))
  .map((status) => ({ value: status, label: status }));

/**
 * The fields of a backend Resource that the review queue uses, as returned by POST /api/resources/find.
 * The shared Resource type is out of date with the backend, so the queue uses this narrow type instead.
 */
export interface ReviewQueueResourceResponse {
  /** E.g. 12 */
  resource_id: number;
  /** E.g. 'Greater Boston Food Bank' */
  organization_name: string;
  /** E.g. 'Weekly Pantry' */
  program_name: string;
  /** Exactly one per resource. E.g. Category.FOOD_ACCESS */
  category: Category;
  /** The raw backend value, e.g. 'pending_review'. A string so values the frontend doesn't recognize can be handled. */
  review_status: string;
  /** Name of the staff member who completed the vetting form. E.g. 'Jane Doe' */
  completed_by: string;
  /** When the resource was created, as an ISO timestamp. E.g. '2026-11-08T14:30:00.000Z' */
  created_at: string;
}

/**
 * A resource as displayed in one row of the review queue.
 */
export interface ReviewQueueResource {
  /** Identifies this specific resource; shown in the ID column and used to build its edit link. */
  resourceId: number;
  /** "Organization — Program", shown in the Resource Name column and matched by search. */
  name: string;
  /** The resource's category, shown as a label in the Category column. */
  category: Category;
  /** Review status, shown as a badge in the Status column. Null if the backend sent a status the frontend doesn't recognize. */
  status: ResourceStatus | null;
  /** Name of the staff member who submitted it, shown in the Submitted By column. */
  submittedBy: string;
  /** When it was submitted, shown as mm/dd/yyyy in the Date Submitted column. */
  dateSubmitted: Date;
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
 * Where the review queue's request for resources is: still in flight, failed, or finished.
 */
export type ReviewQueueLoadState = 'loading' | 'error' | 'success';

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
  /** Text shown in place of rows when resources is empty */
  emptyMessage: string;
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
  status: ResourceStatus | null;
}