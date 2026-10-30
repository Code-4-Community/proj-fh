import { Table } from '@chakra-ui/react';
import ManageStaffTableRow from './parts/ManageStaffTableRow';
import { ManageStaffTableProps } from './types';

/**
 * The table's fixed columns, in display order: each header label and the
 * class that sets its width.
 */


const COLUMNS = [
    { label: 'Name', className: 'manage-staff-col-name' },
    { label: 'Email', className: 'manage-staff-col-email' },
    { label: 'Role', className: 'manage-staff-col-role' },
    { label: 'Date Added', className: 'manage-staff-col-date-added' },
    { label: 'Status', className: 'manage-staff-col-status' },
    { label: 'Actions', className: 'manage-staff-col-actions' },
];

/**
 * The staff table: fixed column headers and one row per staff user.
 * Presentational: renders the users it receives and passes Remove clicks up.
 * `unstyled` leaves styling to manageStaff.css.
 *
 * @param props - The users to render and the Remove handler.
 * @returns The table element.
 */


const ManageStaffTable = ({ 
    staffUsers, 
    onRemoveClick
 }: ManageStaffTableProps) => (
  <Table.Root unstyled className="manage-staff-table">
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
            className="manage-staff-table-column-header"
          >
            {label}
          </Table.ColumnHeader>
        ))}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {staffUsers.map((staffUser) => (
        <ManageStaffTableRow
          key={staffUser.id}
          staffUser={staffUser}
          onRemoveClick={onRemoveClick}
        />
      ))}
    </Table.Body>
  </Table.Root>
);

export default ManageStaffTable;