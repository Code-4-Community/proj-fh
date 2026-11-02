import { Table } from '@chakra-ui/react';
import ReviewQueueTableRow from './parts/ReviewQueueTableRow';
import { ReviewQueueTableProps } from './types';

/**
 * The table's fixed columns, in display order: each header label and the
 * class that sets its width.
 */
const COLUMNS = [
  { label: 'Resource Name', className: 'review-queue-col-name' },
  { label: 'Category', className: 'review-queue-col-category' },
  { label: 'Submitted By', className: 'review-queue-col-submitted-by' },
  { label: 'Date Submitted', className: 'review-queue-col-date' },
  { label: 'Status', className: 'review-queue-col-status' },
];

/**
 * The resource table: fixed column headers and one row per resource, or a
 * message when no resources match. Presentational: filtering happens in the
 * ReviewQueue container. `unstyled` leaves styling to reviewQueue.css.
 *
 * @param props - The resources to render.
 * @returns The table element.
 */
const ReviewQueueTable = ({ resources }: ReviewQueueTableProps) => (
  <Table.Root unstyled className="review-queue-table">
    <Table.ColumnGroup>
      {COLUMNS.map(({ label, className }) => (
        <Table.Column key={label} className={className} />
      ))}
    </Table.ColumnGroup>
    <Table.Header>
      <Table.Row>
        {COLUMNS.map(({ label }) => (
          <Table.ColumnHeader
            key={label}
            className="review-queue-table-column-header"
          >
            {label}
          </Table.ColumnHeader>
        ))}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {resources.length > 0 ? (
        resources.map((resource) => (
          <ReviewQueueTableRow key={resource.resourceId} resource={resource} />
        ))
      ) : (
        <Table.Row>
          <Table.Cell
            colSpan={COLUMNS.length}
            className="review-queue-table-empty"
          >
            No resources match these filters.
          </Table.Cell>
        </Table.Row>
      )}
    </Table.Body>
  </Table.Root>
);

export default ReviewQueueTable;