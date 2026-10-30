import { Badge } from '@chakra-ui/react';
import {
  ManageStaffStatusBadgeProps,
  STAFF_STATUS_BADGE_VARIANT,
} from '../types';

/**
 * A staff user's status, shown as a badge styled by the variant mapped to that status.
 * Display only, not clickable. `unstyled` leaves styling to manageStaff.css.
 *
 * @param props - The status to display.
 * @returns The badge element.
 */
const ManageStaffStatusBadge = ({ status }: ManageStaffStatusBadgeProps) => (
  <Badge
    unstyled
    className={`manage-staff-badge manage-staff-badge-${STAFF_STATUS_BADGE_VARIANT[status]}`}
  >
    {status}
  </Badge>
);

export default ManageStaffStatusBadge;