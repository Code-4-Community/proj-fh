import { describe, expect, it } from '@jest/globals';
import { mapReviewStatus, REVIEW_STATUS_LABEL } from './mapReviewStatus';
import { ResourceStatus } from '../types';

describe('mapReviewStatus', () => {
  it.each([
    ['pending_review', ResourceStatus.PENDING_REVIEW],
    ['approved_published', ResourceStatus.APPROVED_PUBLISHED],
    ['needs_changes', ResourceStatus.NEEDS_CHANGES],
    ['rejected', ResourceStatus.REJECTED],
    ['archived', ResourceStatus.ARCHIVED],
  ])('maps %s to %s', (reviewStatus, expected) => {
    expect(mapReviewStatus(reviewStatus)).toBe(expected);
  });

  it('maps to every display status exactly once', () => {
    expect(Object.values(REVIEW_STATUS_LABEL).sort()).toEqual(
      Object.values(ResourceStatus).sort(),
    );
  });

  it.each([
    ['a status the frontend does not know', 'in_review'],
    ['an empty string', ''],
    ['an enum key name instead of its value', 'PENDING_REVIEW'],
    ['a display label instead of the backend value', 'Pending Review'],
    ['a different casing', 'Pending_Review'],
  ])('returns null for %s', (_description, reviewStatus) => {
    expect(mapReviewStatus(reviewStatus)).toBeNull();
  });

  it.each(['toString', 'constructor', 'hasOwnProperty'])(
    'returns null for the built-in object property %s',
    (reviewStatus) => {
      expect(mapReviewStatus(reviewStatus)).toBeNull();
    },
  );
});