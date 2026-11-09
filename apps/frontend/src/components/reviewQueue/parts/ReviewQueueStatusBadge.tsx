import { Badge } from '@chakra-ui/react';
import {
  RESOURCE_STATUS_BADGE_VARIANT,
  ReviewQueueStatusBadgeProps,
  UNKNOWN_STATUS_BADGE_VARIANT,
  UNKNOWN_STATUS_LABEL,
} from '../types';

/**
 * A resource's status, shown as a badge styled by the variant mapped to that status.
 * A status the frontend doesn't recognize (null) is shown as "Unknown", so it never looks like a known status.
 * Display only, not clickable. `unstyled` leaves styling to reviewQueue.css.
 *
 * @param props - The status to display, or null for an unrecognized status.
 * @returns The badge element.
 */
const ReviewQueueStatusBadge = ({ status }: ReviewQueueStatusBadgeProps) => {
  const variant =
    status === null
      ? UNKNOWN_STATUS_BADGE_VARIANT
      : RESOURCE_STATUS_BADGE_VARIANT[status];

  return (
    <Badge
      unstyled
      className={`review-queue-badge review-queue-badge-${variant}`}
    >
      {status ?? UNKNOWN_STATUS_LABEL}
    </Badge>
  );
};

export default ReviewQueueStatusBadge;