import { Badge } from '@chakra-ui/react';
import {
  RESOURCE_STATUS_BADGE_VARIANT,
  ReviewQueueStatusBadgeProps,
} from '../types';

/**
 * A resource's status, shown as a badge styled by the variant mapped to that status.
 * Display only, not clickable. `unstyled` leaves styling to reviewQueue.css.
 *
 * @param props - The status to display.
 * @returns The badge element.
 */
const ReviewQueueStatusBadge = ({ status }: ReviewQueueStatusBadgeProps) => (
  <Badge
    unstyled
    className={`review-queue-badge review-queue-badge-${RESOURCE_STATUS_BADGE_VARIANT[status]}`}
  >
    {status}
  </Badge>
);

export default ReviewQueueStatusBadge;