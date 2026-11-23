import { Table } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/formatDate';
import ReviewQueueStatusBadge from './ReviewQueueStatusBadge';
import { CATEGORY_LABEL, ReviewQueueTableRowProps } from '../types';

/**
 * One row of the resource table: id, name, categories, submitter, submission date,
 * and status, plus an optional action cell. By default the whole row is clickable
 * (and opens with Enter) and leads to the resource's edit page.
 *
 * @param props - The resource to display and the optional row settings.
 * @returns The table row.
 */
const ReviewQueueTableRow = ({
  resource,
  showSubmittedBy = true,
  rowsClickable = true,
  action,
}: ReviewQueueTableRowProps) => {
  const { resourceId, name, category, submittedBy, dateSubmitted, status } = resource;
  const navigate = useNavigate();

  const openResource = () => navigate(`/resources/${resourceId}/edit`);

  return (
    <Table.Row
      className={
        rowsClickable
          ? 'review-queue-table-row review-queue-table-row-clickable'
          : 'review-queue-table-row'
      }
      tabIndex={rowsClickable ? 0 : undefined}
      onClick={rowsClickable ? openResource : undefined}
      onKeyDown={
        rowsClickable
          ? (event) => {
              if (event.key === 'Enter') openResource();
            }
          : undefined
      }
    >
      <Table.Cell className="review-queue-table-cell">{resourceId}</Table.Cell>
      <Table.Cell className="review-queue-table-cell">{name}</Table.Cell>
      <Table.Cell className="review-queue-table-cell">
        {CATEGORY_LABEL[category]}
      </Table.Cell>
      {showSubmittedBy && (
        <Table.Cell className="review-queue-table-cell">{submittedBy}</Table.Cell>
      )}
      <Table.Cell className="review-queue-table-cell">
        {formatDate(dateSubmitted)}
      </Table.Cell>
      <Table.Cell className="review-queue-table-cell">
        <ReviewQueueStatusBadge status={status} />
      </Table.Cell>
      {action !== undefined && (
        <Table.Cell className="review-queue-table-cell">{action}</Table.Cell>
      )}
    </Table.Row>
  );
};

export default ReviewQueueTableRow;