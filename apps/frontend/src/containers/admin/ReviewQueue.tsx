import { useEffect, useState } from 'react';
import { Flex, Text } from '@chakra-ui/react';
import ReviewQueueFilterBar from '../../components/reviewQueue/ReviewQueueFilterBar';
import ReviewQueueTable from '../../components/reviewQueue/ReviewQueueTable';
import ReviewQueueHeader from '../../components/reviewQueue/parts/ReviewQueueHeader';
  import {
    ReviewQueueFilters,
    ReviewQueueLoadState,
    ReviewQueueResource,
  } from '../../components/reviewQueue/types';
import { filterReviewQueueResources } from '../../components/reviewQueue/filterReviewQueueResources';
import apiClient from '../../api/apiClient';
import '../../components/reviewQueue/reviewQueue.css';

// TODO: Replace with variable in the future
const TITLE = 'Review Queue';

// TODO: Replace with variable in the future
const SUBTITLE = 'Pending and incomplete submissions waiting for vetting';

// TODO: Replace with variable in the future
const LOADING_MESSAGE = 'Loading resources…';

// TODO: Replace with variable in the future
const ERROR_MESSAGE = "Couldn't load resources. Please try again later.";

// TODO: Replace with variable in the future
const EMPTY_QUEUE_MESSAGE = 'There are no resources to review.';

// TODO: Replace with variable in the future
const NO_MATCHES_MESSAGE = 'No resources match these filters.';

const NO_FILTERS: ReviewQueueFilters = { category: '', status: '', search: '' };

/**
 * Review Queue page: loads resources from the backend, lists them with their ID,
 * name, category, and status, and lets admins filter them by category, status,
 * and name. Owns the loaded data, the request's loading and error state, the
 * filter state, and the filtering, and passes each component only the data it renders.
 *
 * @returns The Review Queue page.
 */
const ReviewQueue = () => {
  const [filters, setFilters] = useState<ReviewQueueFilters>(NO_FILTERS);

  const [resources, setResources] = useState<ReviewQueueResource[]>([]);
  const [loadState, setLoadState] = useState<ReviewQueueLoadState>('loading');

  useEffect(() => {
    // Stops a response that arrives after the page unmounts from updating state.
    let ignore = false;
    apiClient
      .getReviewQueueResources()
      .then((loaded) => {
        if (ignore) return;
        setResources(loaded);
        setLoadState('success');
      })
      .catch(() => {
        if (!ignore) setLoadState('error');
      });
    return () => {
      ignore = true;
    };
  }, []);

  const visibleResources = filterReviewQueueResources(resources, filters);
  const emptyMessage =
    resources.length === 0 ? EMPTY_QUEUE_MESSAGE : NO_MATCHES_MESSAGE;

  return (
    <Flex direction="column" className="review-queue">
      <ReviewQueueHeader title={TITLE} subtitle={SUBTITLE} />
      <Flex direction="column" className="review-queue-content">
        <ReviewQueueFilterBar filters={filters} onFiltersChange={setFilters} />
                {loadState === 'loading' && (
          <Text role="status" className="review-queue-message">
            {LOADING_MESSAGE}
          </Text>
        )}
        {loadState === 'error' && (
          <Text
            role="alert"
            className="review-queue-message review-queue-message-error"
          >
            {ERROR_MESSAGE}
          </Text>
        )}
        {loadState === 'success' && (
          <ReviewQueueTable
            resources={visibleResources}
            emptyMessage={emptyMessage}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default ReviewQueue;