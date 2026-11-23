import { Link } from 'react-router-dom';
import { ReviewQueueEditLinkProps } from '../types';

/**
 * A pencil icon that links to a resource's edit page. The icon is decorative,
 * so the link's accessible name comes from its aria-label.
 *
 * @param props - The edit page path and the resource's name.
 * @returns The link element.
 */
const ReviewQueueEditLink = ({ to, resourceName }: ReviewQueueEditLinkProps) => (
  <Link
    to={to}
    aria-label={`Edit ${resourceName}`}
    className="review-queue-edit-link"
  >
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  </Link>
);

export default ReviewQueueEditLink;
