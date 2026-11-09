import { ReviewQueueFilters, ReviewQueueResource } from './types';

/**
 * Applies the review queue's Category, Status, and Search filters together.
 * A Category or Status filter set to '' is off and matches every resource.
 *
 * @param resources - The resources loaded for the queue.
 * @param filters - The current filter selections.
 * @returns The resources that match every active filter, in their original order.
 */
export const filterReviewQueueResources = (
  resources: ReviewQueueResource[],
  { category, status, search }: ReviewQueueFilters,
): ReviewQueueResource[] => {
  const query = search.trim().toLowerCase();
  return resources.filter(
    (resource) =>
      (!category || resource.category === category) &&
      (!status || resource.status === status) &&
      resource.name.toLowerCase().includes(query),
  );
};