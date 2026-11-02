import { Field, Input } from '@chakra-ui/react';
import { ReviewQueueSearchBarProps } from '../types';

/**
 * Labeled search input for the resource table. Presentational: the search text
 * and the filtering live in the ReviewQueue container. `unstyled` leaves styling
 * to reviewQueue.css.
 *
 * @param props - The current search text and the handler for changes.
 * @returns The labeled search input.
 */
const ReviewQueueSearchBar = ({
  value,
  onChange,
}: ReviewQueueSearchBarProps) => (
  <Field.Root className="review-queue-search-field">
    <Field.Label className="review-queue-filter-label">Search</Field.Label>
    <Input
      unstyled
      className="review-queue-search"
      placeholder="Search by name or keyword"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </Field.Root>
);

export default ReviewQueueSearchBar;