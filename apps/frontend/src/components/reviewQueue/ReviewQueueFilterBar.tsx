import { Flex } from '@chakra-ui/react';
import ReviewQueueFilterSelect from './parts/ReviewQueueFilterSelect';
import ReviewQueueSearchBar from './parts/ReviewQueueSearchBar';
import {
  CATEGORY_OPTIONS,
  ReviewQueueFilterBarProps,
  STATUS_OPTIONS,
} from './types';

/**
 * The row of Category, Status, and Search controls. Presentational: shows the
 * filters it receives and passes every change up as the full updated filters.
 *
 * @param props - The current filters and the handler for changes.
 * @returns The filter row.
 */
const ReviewQueueFilterBar = ({
  filters,
  onFiltersChange,
}: ReviewQueueFilterBarProps) => (
  <Flex align="flex-end" className="review-queue-filter-bar">
    <ReviewQueueFilterSelect
      label="Category"
      value={filters.category}
      options={CATEGORY_OPTIONS}
      onChange={(category) => onFiltersChange({ ...filters, category })}
    />
    <ReviewQueueFilterSelect
      label="Status"
      value={filters.status}
      options={STATUS_OPTIONS}
      onChange={(status) => onFiltersChange({ ...filters, status })}
    />
    <ReviewQueueSearchBar
      value={filters.search}
      onChange={(search) => onFiltersChange({ ...filters, search })}
    />
  </Flex>
);

export default ReviewQueueFilterBar;