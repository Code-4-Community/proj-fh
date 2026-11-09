import { Table } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/formatDate';
import ReviewQueueStatusBadge from './ReviewQueueStatusBadge';
import { CATEGORY_LABEL, ReviewQueueTableRowProps } from '../types';

/**
 * One row of the resource table: id, name, categories, submitter, submission date,
 * and status. The whole row is clickable (and opens with Enter) and leads to the
 * resource's edit page.
 *
 * @param props - The resource to display.
 * @returns The table row.
 */
const ReviewQueueTableRow = ({ resource }: ReviewQueueTableRowProps) => {
  const { resourceId, name, category, submittedBy, dateSubmitted, status } = resource;
  const navigate = useNavigate();

  const openResource = () => navigate(`/resources/${resourceId}/edit`);

  return (
    <Table.Row
      className="review-queue-table-row"
      tabIndex={0}
      onClick={openResource}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openResource();
      }}
    >
      <Table.Cell className="review-queue-table-cell">{resourceId}</Table.Cell>
      <Table.Cell className="review-queue-table-cell">{name}</Table.Cell>
      <Table.Cell className="review-queue-table-cell">
        {CATEGORY_LABEL[category]}
      </Table.Cell>
      <Table.Cell className="review-queue-table-cell">{submittedBy}</Table.Cell>
      <Table.Cell className="review-queue-table-cell">
        {formatDate(dateSubmitted)}
      </Table.Cell>
      <Table.Cell className="review-queue-table-cell">
        <ReviewQueueStatusBadge status={status} />
      </Table.Cell>
    </Table.Row>
  );
};

export default ReviewQueueTableRow;