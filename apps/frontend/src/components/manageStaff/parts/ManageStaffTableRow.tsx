import { Button, Table } from '@chakra-ui/react';
import ManageStaffStatusBadge from './ManageStaffStatusBadge';
import { ManageStaffTableRowProps, STAFF_ROLE_LABEL } from '../types';

/**
 * Formats a date as mm/dd/yyyy.
 *
 * @param date - The date to format.
 * @returns The formatted date.
 */
const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

/**
 * One row of the staff table: name, email, role, date added, status, and a
 * Remove button. Presentational: Remove passes this row's user id to the
 * handler it receives. `unstyled` leaves the button's styling to manageStaff.css.
 *
 * @param props - The user to display and the Remove handler.
 * @returns The table row.
 */
const ManageStaffTableRow = ({
  staffUser,
  onRemoveClick,
}: ManageStaffTableRowProps) => {
  const { id, firstName, lastName, email, role, dateAdded, status } = staffUser;
  const fullName = `${firstName} ${lastName}`;

  return (
    <Table.Row>
      <Table.Cell className="manage-staff-table-cell">{fullName}</Table.Cell>
      <Table.Cell className="manage-staff-table-cell">{email}</Table.Cell>
      <Table.Cell className="manage-staff-table-cell">
        {STAFF_ROLE_LABEL[role]}
      </Table.Cell>
      <Table.Cell className="manage-staff-table-cell">
        {formatDate(dateAdded)}
      </Table.Cell>
      <Table.Cell className="manage-staff-table-cell">
        <ManageStaffStatusBadge status={status} />
      </Table.Cell>
      <Table.Cell className="manage-staff-table-cell">
        <Button
          unstyled
          className="manage-staff-remove-button"
          aria-label={`Remove ${fullName}`}
          onClick={() => onRemoveClick(id)}
        >
          Remove
        </Button>
      </Table.Cell>
    </Table.Row>
  );
};

export default ManageStaffTableRow;
