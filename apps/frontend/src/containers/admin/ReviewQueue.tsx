import { useState } from 'react';
import { Flex } from '@chakra-ui/react';
import ReviewQueueFilterBar from '../../components/reviewQueue/ReviewQueueFilterBar';
import ReviewQueueTable from '../../components/reviewQueue/ReviewQueueTable';
import ReviewQueueHeader from '../../components/reviewQueue/parts/ReviewQueueHeader';
import {
  ReviewQueueFilters,
  ReviewQueueResource,
} from '../../components/reviewQueue/types';
import { Category, ResourceStatus } from '../../types';
import '../../components/reviewQueue/reviewQueue.css';

// TODO: Replace with variable in the future
const TITLE = 'Review Queue';

// TODO: Replace with variable in the future
const SUBTITLE = 'Pending and incomplete submissions waiting for vetting';

/**
 * Hardcoded resources that make the page match the design for now.
 * Date months are 0-indexed: new Date(2026, 9, 14) is October 14, 2026.
 */
const RESOURCES: ReviewQueueResource[] = [
  // TODO: Replace with variable in the future
  {
    resourceId: 1,
    name: 'Greater Boston Food Bank',
    categories: [Category.FOOD_ACCESS],
    submittedBy: 'Jordan Lee',
    dateSubmitted: new Date(2026, 9, 14),
    status: ResourceStatus.REJECTED,
  },
  // TODO: Replace with variable in the future
  {
    resourceId: 2,
    name: 'Pine Street Inn',
    categories: [Category.HOUSING],
    submittedBy: 'Maria Santos',
    dateSubmitted: new Date(2026, 9, 16),
    status: ResourceStatus.PENDING_REVIEW,
  },
  // TODO: Replace with variable in the future
  {
    resourceId: 3,
    name: 'Community Servings',
    categories: [Category.FOOD_ACCESS, Category.OTHER],
    submittedBy: 'Alex Kim',
    dateSubmitted: new Date(2026, 9, 18),
    status: ResourceStatus.NEEDS_CHANGES,
  },
  // TODO: Replace with variable in the future
  {
    resourceId: 4,
    name: 'Boston Housing Authority',
    categories: [Category.HOUSING],
    submittedBy: 'Jordan Lee',
    dateSubmitted: new Date(2026, 9, 20),
    status: ResourceStatus.PENDING_REVIEW,
  },
  // TODO: Replace with variable in the future
  {
    resourceId: 5,
    name: 'Women’s Lunch Place',
    categories: [Category.FOOD_ACCESS],
    submittedBy: 'Priya Patel',
    dateSubmitted: new Date(2026, 9, 22),
    status: ResourceStatus.APPROVED_PUBLISHED,
  },
  // TODO: Replace with variable in the future
  {
    resourceId: 6,
    name: 'Legal Aid Clinic',
    categories: [Category.OTHER],
    submittedBy: 'Maria Santos',
    dateSubmitted: new Date(2026, 9, 25),
    status: ResourceStatus.ARCHIVED,
  },
  // TODO: Replace with variable in the future
  {
    resourceId: 7,
    name: 'HomeStart',
    categories: [Category.HOUSING, Category.OTHER],
    submittedBy: 'Alex Kim',
    dateSubmitted: new Date(2026, 9, 28),
    status: ResourceStatus.PENDING_REVIEW,
  },
];

const NO_FILTERS: ReviewQueueFilters = { category: '', status: '', search: '' };

/**
 * Review Queue page: lists resources with their category and status and lets
 * admins filter them by category, status, and name. Owns the filter state and
 * the filtering, and passes each component only the data it renders.
 *
 * @returns The Review Queue page.
 */
const ReviewQueue = () => {
  const [filters, setFilters] = useState<ReviewQueueFilters>(NO_FILTERS);

  const query = filters.search.trim().toLowerCase();
  const visibleResources = RESOURCES.filter(
    (resource) =>
      (!filters.category || resource.categories.includes(filters.category)) &&
      (!filters.status || resource.status === filters.status) &&
      resource.name.toLowerCase().includes(query),
  );

  return (
    <Flex direction="column" className="review-queue">
      <ReviewQueueHeader title={TITLE} subtitle={SUBTITLE} />
      <Flex direction="column" className="review-queue-content">
        <ReviewQueueFilterBar filters={filters} onFiltersChange={setFilters} />
        <ReviewQueueTable resources={visibleResources} />
      </Flex>
    </Flex>
  );
};

export default ReviewQueue;