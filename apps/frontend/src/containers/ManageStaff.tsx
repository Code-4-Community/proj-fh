import { useState } from 'react';
import { Flex } from '@chakra-ui/react';
import ManageStaffTable from '../components/manageStaff/ManageStaffTable';
import ManageStaffHeader from '../components/manageStaff/parts/ManageStaffHeader';
import ManageStaffSearchBar from '../components/manageStaff/parts/ManageStaffSearchBar';
import { StaffStatus, StaffUser } from '../components/manageStaff/types';
import '../components/manageStaff/manageStaff.css';

/**
 * Hardcoded staff users that make the page match the design for now.
 */
const STAFF_USERS: StaffUser[] = [
  // TODO: Replace with variable in the future
  {
    id: 1,
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'msantos@example.org',
    role: 'COMMUNITY_STAFF',
    dateAdded: new Date(2026, 8, 14),
    status: StaffStatus.ACTIVE,
  },
  // TODO: Replace with variable in the future
  {
    id: 2,
    firstName: 'James',
    lastName: 'Chen',
    email: 'jchen@example.org',
    role: 'COMMUNITY_STAFF',
    dateAdded: new Date(2026, 8, 14),
    status: StaffStatus.ACTIVE,
  },
  // TODO: Replace with variable in the future
  {
    id: 3,
    firstName: 'Aisha',
    lastName: 'Johnson',
    email: 'ajohnson@example.org',
    role: 'ADMIN',
    dateAdded: new Date(2026, 8, 2),
    status: StaffStatus.ACTIVE,
  },
  // TODO: Replace with variable in the future
  {
    id: 4,
    firstName: 'Daniel',
    lastName: 'Kim',
    email: 'dkim@example.org',
    role: 'COMMUNITY_STAFF',
    dateAdded: new Date(2026, 9, 27),
    status: StaffStatus.INVITED,
  },
  // TODO: Replace with variable in the future
  {
    id: 5,
    firstName: 'Elena',
    lastName: 'Rossi',
    email: 'erossi@example.org',
    role: 'COMMUNITY_STAFF',
    dateAdded: new Date(2026, 9, 5),
    status: StaffStatus.ACTIVE,
  },
  // TODO: Replace with variable in the future
  {
    id: 6,
    firstName: 'Marcus',
    lastName: 'Brown',
    email: 'mbrown@example.org',
    role: 'COMMUNITY_STAFF',
    dateAdded: new Date(2026, 9, 12),
    status: StaffStatus.ACTIVE,
  },
];

/**
 * Manage Staff page: lists staff users with their role and status and lets
 * admins search them by name or email. Owns the search text and the filtering,
 * and passes each component only the data it renders.
 *
 * @returns The Manage Staff page.
 */
const ManageStaff = () => {
  const [searchText, setSearchText] = useState('');

  const query = searchText.trim().toLowerCase();
  const visibleStaffUsers = STAFF_USERS.filter(
    ({ firstName, lastName, email }) =>
      `${firstName} ${lastName}`.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query),
  );

  // TODO: Replace with variable in the future
  const handleAddStaffClick = () => {};

  // TODO: Replace with variable in the future
  const handleRemoveClick = () => {};

  return (
    <Flex direction="column" className="manage-staff">
      <ManageStaffHeader onAddStaffClick={handleAddStaffClick} />
      <Flex direction="column" className="manage-staff-content">
        <ManageStaffSearchBar value={searchText} onChange={setSearchText} />
        <ManageStaffTable
          staffUsers={visibleStaffUsers}
          onRemoveClick={handleRemoveClick}
        />
      </Flex>
    </Flex>
  );
};

export default ManageStaff;