import { Table } from '@chakra-ui/react';
import ReviewQueueTableRow from './parts/ReviewQueueTableRow';
import { ReviewQueueTableProps } from './types';

/**
 * The table's fixed columns, in display order: each header label and the
 * class that sets its width.
 */
const COLUMNS = [
  { label: 'ID', className: 'review-queue-col-id' },
  { label: 'Resource Name', className: 'review-queue-col-name' },
  { label: 'Category', className: 'review-queue-col-category' },
  { label: 'Submitted By', className: 'review-queue-col-submitted-by' },
  { label: 'Date Submitted', className: 'review-queue-col-date' },
  { label: 'Status', className: 'review-queue-col-status' },
];

/** Header label of the column that can be hidden with `showSubmittedBy`. */
const SUBMITTED_BY_LABEL = 'Submitted By';

/** The trailing column shown only when the table is given `renderAction`. */
const ACTION_COLUMN = { label: 'Action', className: 'review-queue-col-action' };

/**
 * The resource table: column headers and one row per resource, or a message
 * when there are none to show. Submitted By can be hidden and an Action column
 * added; by default it shows the admin Review Queue's columns. Presentational:
 * loading and filtering happen in the container. `unstyled` leaves styling to reviewQueue.css.
 *
 * @param props - The resources to render, the message to show when there are none, and the optional column settings.
 * @returns The table element.
 */
const ReviewQueueTable = ({
  resources,
  emptyMessage,
  showSubmittedBy = true,
  rowsClickable = true,
  renderAction,
}: ReviewQueueTableProps) => {
  const columns = [
    ...COLUMNS.filter(
      ({ label }) => showSubmittedBy || label !== SUBMITTED_BY_LABEL,
    ),
    ...(renderAction ? [ACTION_COLUMN] : []),
  ];

  return (
    <Table.Root unstyled className="review-queue-table">
      <Table.ColumnGroup>
        {columns.map(({ label, className }) => (
          <Table.Column key={label} className={className} />
        ))}
      </Table.ColumnGroup>
      <Table.Header>
        <Table.Row>
          {columns.map(({ label }) => (
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
            <ReviewQueueTableRow
              key={resource.resourceId}
              resource={resource}
              showSubmittedBy={showSubmittedBy}
              rowsClickable={rowsClickable}
              action={renderAction ? (renderAction(resource) ?? null) : undefined}
            />
          ))
        ) : (
          <Table.Row>
            <Table.Cell
              colSpan={columns.length}
              className="review-queue-table-empty"
            >
              {emptyMessage}
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
};

export default ReviewQueueTable;