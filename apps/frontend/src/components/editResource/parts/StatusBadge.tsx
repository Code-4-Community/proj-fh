import { Badge } from '@chakra-ui/react';
import { ResourceStatus } from '../../../types';
import { STATUS_BADGE_VARIANTS } from '../types';

interface StatusBadgeProps {
  /** The status to display. Its text is shown exactly as the enum value. */
  status: ResourceStatus;
}

/**
 * A small non-interactive badge showing a resource's status.
 * Its look comes from the variant mapped to the status.
 *
 * @param props - The status to display.
 * @returns The badge.
 */
const StatusBadge = ({ status }: StatusBadgeProps) => (
  <Badge
    unstyled
    className={`edit-resource-status-badge edit-resource-status-badge-${STATUS_BADGE_VARIANTS[status]}`}
  >
    {status}
  </Badge>
);

export default StatusBadge;