import { useState } from 'react';
import { Flex } from '@chakra-ui/react';
import ReviewQueueFilterBar from '../../components/reviewQueue/ReviewQueueFilterBar';
import ReviewQueueTable from '../../components/reviewQueue/ReviewQueueTable';
import ReviewQueueHeader from '../../components/reviewQueue/parts/ReviewQueueHeader';
import ReviewQueueAddMenu from '../../components/reviewQueue/parts/ReviewQueueAddMenu';
import ReviewQueueEditLink from '../../components/reviewQueue/parts/ReviewQueueEditLink';
import {
  ReviewQueueAddMenuItem,
  ReviewQueueFilters,
  ReviewQueueResource,
} from '../../components/reviewQueue/types';
import { filterReviewQueueResources } from '../../components/reviewQueue/filterReviewQueueResources';
import { ResourceStatus } from '../../types';
import { STAFF_RESOURCES } from './staffResources';
import '../../components/reviewQueue/reviewQueue.css';

// TODO: Replace with variable in the future
const TITLE = 'My Resources';

// TODO: Replace with variable in the future
const ADD_BUTTON_LABEL = '+ Add Resources';

// TODO: Replace with variable in the future
const EMPTY_MESSAGE = "You haven't submitted any resources.";

// TODO: Replace with variable in the future
const NO_MATCHES_MESSAGE = 'No resources match these filters.';

/** Where each Add Resources menu item leads. Each path must match a route defined in app.tsx. */
const ADD_MENU_ITEMS: ReviewQueueAddMenuItem[] = [
  { label: 'Housing', path: '/submit-resource/housing' },
  { label: 'Food', path: '/submit-resource/food' },
];

const NO_FILTERS: ReviewQueueFilters = { category: '', status: '', search: '' };

/** The shared hardcoded staff resources, as table rows ("Organization — Program"). */
const RESOURCES: ReviewQueueResource[] = STAFF_RESOURCES.map(
  ({ resourceId, organizationName, programName, category, status, dateSubmitted }) => ({
    resourceId,
    name: `${organizationName} — ${programName}`,
    category,
    status,
    dateSubmitted,
  }),
);

/**
 * Staff My Resources page: lists the staff member's submitted resources and lets
 * them filter by category, status, and name, add a resource, and open the edit
 * page for ones that need changes. Reuses the Review Queue's pieces, minus the
 * Submitted By column and with an Action column. Owns the filter state, takes
 * its hardcoded data from staffResources.ts (which the staff edit page also reads),
 * and passes each component only the data it renders.
 *
 * @returns The My Resources page.
 */
const MyResources = () => {
  const [filters, setFilters] = useState<ReviewQueueFilters>(NO_FILTERS);

  const visibleResources = filterReviewQueueResources(RESOURCES, filters);
  const emptyMessage =
    RESOURCES.length === 0 ? EMPTY_MESSAGE : NO_MATCHES_MESSAGE;

  return (
    <Flex direction="column" className="review-queue">
      <ReviewQueueHeader title={TITLE} />
      <Flex direction="column" className="review-queue-content">
        <Flex justify="space-between" align="flex-end">
          <ReviewQueueFilterBar
            filters={filters}
            onFiltersChange={setFilters}
          />
          <ReviewQueueAddMenu label={ADD_BUTTON_LABEL} items={ADD_MENU_ITEMS} />
        </Flex>
        <ReviewQueueTable
          resources={visibleResources}
          emptyMessage={emptyMessage}
          showSubmittedBy={false}
          rowsClickable={false}
          renderAction={({ resourceId, name, status }) =>
            status === ResourceStatus.NEEDS_CHANGES ? (
              <ReviewQueueEditLink
                to={`/my-resources/${resourceId}/edit`}
                resourceName={name}
              />
            ) : null
          }
        />
      </Flex>
    </Flex>
  );
};

export default MyResources;
