import { describe, expect, it } from '@jest/globals';
import { filterReviewQueueResources } from './filterReviewQueueResources';
import {
  CATEGORY_LABEL,
  ReviewQueueFilters,
  ReviewQueueResource,
  STATUS_OPTIONS,
} from './types';
import { Category, ResourceStatus } from '../../types';

const NO_FILTERS: ReviewQueueFilters = { category: '', status: '', search: '' };

const RESOURCES: ReviewQueueResource[] = [
  {
    resourceId: 1,
    name: 'Greater Boston Food Bank — Weekly Pantry',
    category: Category.FOOD_ACCESS,
    submittedBy: 'Jane Doe',
    dateSubmitted: new Date(2026, 10, 1),
    status: ResourceStatus.PENDING_REVIEW,
  },
  {
    resourceId: 2,
    name: 'Pine Street Inn — Housing Program',
    category: Category.HOUSING,
    submittedBy: 'John Doe',
    dateSubmitted: new Date(2026, 10, 2),
    status: ResourceStatus.NEEDS_CHANGES,
  },
  {
    resourceId: 3,
    name: 'Greater Boston Food Bank — Mobile Market',
    category: Category.FOOD_ACCESS,
    submittedBy: 'Jane Doe',
    dateSubmitted: new Date(2026, 10, 3),
    status: ResourceStatus.APPROVED_PUBLISHED,
  },
  {
    resourceId: 4,
    name: 'Legal Aid Clinic — Tenant Rights',
    category: Category.OTHER,
    submittedBy: 'John Doe',
    dateSubmitted: new Date(2026, 10, 4),
    // A status the frontend doesn't recognize
    status: null,
  },
];

/** Runs the filter with the given selections and returns the IDs of the matching resources. */
const filteredIds = (filters: Partial<ReviewQueueFilters>) =>
  filterReviewQueueResources(RESOURCES, { ...NO_FILTERS, ...filters }).map(
    (resource) => resource.resourceId,
  );

describe('filterReviewQueueResources', () => {
  describe('with no filters', () => {
    it('returns every resource in its original order', () => {
      expect(filteredIds({})).toEqual([1, 2, 3, 4]);
    });

    it('includes a resource with an unrecognized status', () => {
      expect(filteredIds({})).toContain(4);
    });
  });

  describe('Category filter', () => {
    it.each([
      [Category.FOOD_ACCESS, [1, 3]],
      [Category.HOUSING, [2]],
      [Category.OTHER, [4]],
    ])('shows only %s resources', (category, expected) => {
      expect(filteredIds({ category })).toEqual(expected);
    });
  });

  describe('Status filter', () => {
    it.each([
      [ResourceStatus.PENDING_REVIEW, [1]],
      [ResourceStatus.APPROVED_PUBLISHED, [3]],
      [ResourceStatus.NEEDS_CHANGES, [2]],
    ])('shows only %s resources', (status, expected) => {
      expect(filteredIds({ status })).toEqual(expected);
    });

    it('leaves out a resource with an unrecognized status when a status is selected', () => {
      expect(filteredIds({ status: ResourceStatus.NEEDS_CHANGES })).not.toContain(4);
    });
  });

  describe('Search', () => {
    it('matches the organization part of the name', () => {
      expect(filteredIds({ search: 'greater boston' })).toEqual([1, 3]);
    });

    it('matches the program part of the name', () => {
      expect(filteredIds({ search: 'mobile market' })).toEqual([3]);
    });

    it('ignores case', () => {
      expect(filteredIds({ search: 'PINE street' })).toEqual([2]);
    });

    it('ignores spaces around the search text', () => {
      expect(filteredIds({ search: '  pine  ' })).toEqual([2]);
    });

    it('shows every resource when the search is only spaces', () => {
      expect(filteredIds({ search: '   ' })).toEqual([1, 2, 3, 4]);
    });

    it('returns no resources when nothing matches', () => {
      expect(filteredIds({ search: 'no such resource' })).toEqual([]);
    });
  });

  describe('combined filters', () => {
    it('applies Category, Status, and Search together', () => {
      expect(
        filteredIds({
          category: Category.FOOD_ACCESS,
          status: ResourceStatus.APPROVED_PUBLISHED,
          search: 'boston',
        }),
      ).toEqual([3]);
    });

    it('returns no resources when the filters match nothing together', () => {
      expect(
        filteredIds({ category: Category.HOUSING, search: 'food bank' }),
      ).toEqual([]);
    });
  });
});

describe('review queue display constants', () => {
  it.each([
    [Category.FOOD_ACCESS, 'Food'],
    [Category.HOUSING, 'Housing'],
    [Category.OTHER, 'Other'],
  ])('labels category %s as %s', (category, label) => {
    expect(CATEGORY_LABEL[category]).toBe(label);
  });

  it('leaves Rejected and Archived out of the Status dropdown', () => {
    expect(STATUS_OPTIONS.map((option) => option.value)).toEqual([
      ResourceStatus.PENDING_REVIEW,
      ResourceStatus.APPROVED_PUBLISHED,
      ResourceStatus.NEEDS_CHANGES,
    ]);
  });
});