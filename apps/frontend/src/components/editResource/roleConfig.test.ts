import { describe, expect, it } from '@jest/globals';
import { getEditResourceRoleConfig } from './roleConfig';
import { Status } from '../../types';

describe('getEditResourceRoleConfig', () => {
  it('gives admins the status actions, no notes, and leaves Back as a no-op', () => {
    const config = getEditResourceRoleConfig(Status.ADMIN);

    expect(config.showStatusActions).toBe(true);
    expect(config.usesStaffResources).toBe(false);
    expect(config.showNeedsChangesNotes).toBe(false);
    expect(config.backPath).toBeNull();
  });

  it('gives staff the notes, no status actions, and Back to My Resources', () => {
    const config = getEditResourceRoleConfig(Status.COMMUNITY_STAFF);

    expect(config.showStatusActions).toBe(false);
    expect(config.usesStaffResources).toBe(true);
    expect(config.showNeedsChangesNotes).toBe(true);
    expect(config.backPath).toBe('/my-resources');
  });

  it('gives any other role no status actions and no notes', () => {
    const config = getEditResourceRoleConfig(Status.ANONYMOUS);

    expect(config.showStatusActions).toBe(false);
    expect(config.showNeedsChangesNotes).toBe(false);
    expect(config.backPath).toBeNull();
  });
});
