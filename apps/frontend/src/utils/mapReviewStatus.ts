import { ResourceStatus } from '../types';

/**
 * The review_status values the backend sends. Mirrors the ReviewStatus enum in apps/backend,
 * so update both together if the backend's statuses change.
 */
type BackendReviewStatus =
  | 'pending_review'
  | 'approved_published'
  | 'needs_changes'
  | 'rejected'
  | 'archived';

/**
 * The display status for each backend review_status value.
 */
export const REVIEW_STATUS_LABEL: Record<BackendReviewStatus, ResourceStatus> = {
  pending_review: ResourceStatus.PENDING_REVIEW,
  approved_published: ResourceStatus.APPROVED_PUBLISHED,
  needs_changes: ResourceStatus.NEEDS_CHANGES,
  rejected: ResourceStatus.REJECTED,
  archived: ResourceStatus.ARCHIVED,
};

/**
 * Maps a backend review_status value to the status shown in the UI.
 *
 * @param reviewStatus the review_status value from the API, e.g. 'pending_review'
 * @returns the matching ResourceStatus, or null if the value isn't a known review_status
 */
export const mapReviewStatus = (reviewStatus: string): ResourceStatus | null =>
  Object.prototype.hasOwnProperty.call(REVIEW_STATUS_LABEL, reviewStatus)
    ? REVIEW_STATUS_LABEL[reviewStatus as BackendReviewStatus]
    : null;
