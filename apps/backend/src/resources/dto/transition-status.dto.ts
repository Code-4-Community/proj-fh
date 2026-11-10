import { ReviewStatus } from '../types';

/**
 * The request body for moving a Resource to a new review status.
 */
export type TransitionStatusDto = {
    /** The review status to move the resource to. E.g. ReviewStatus.APPROVED_PUBLISHED. */
    status: ReviewStatus;
};
