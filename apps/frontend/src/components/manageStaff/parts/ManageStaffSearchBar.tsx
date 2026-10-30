import { Input } from '@chakra-ui/react';
import { ManageStaffSearchBarProps } from '../types';

/**
 * Search input for the staff table. Presentational: the search text and the
 * filtering live in the ManageStaff container. `unstyled` leaves styling to
 * manageStaff.css.
 *
 * @param props - The current search text and the handler for changes.
 * @returns The search input.
 */

const ManageStaffSearchBar = ({
  value,
  onChange,
}: ManageStaffSearchBarProps) => (
  <Input
    unstyled
    className="manage-staff-search"
    placeholder="Search by name or email"
    aria-label="Search by name or email"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

export default ManageStaffSearchBar;
