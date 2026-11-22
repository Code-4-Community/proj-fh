import { ResourceStatus, Status } from '../../types';

/**
 * What the Edit Resource page shows or does for a user's role.
 */
export interface EditResourceRoleConfig {
  /** The hardcoded status shown when the page doesn't look up a resource. */
  placeholderStatus: ResourceStatus;
  /** Whether the page looks the resource up by the route's resourceId in the hardcoded staff resources. */
  usesStaffResources: boolean;
  /** Where Back leads, or null to leave Back doing nothing. */
  backPath: string | null;
  /** Whether the status panel offers Re-verify, Archive Resource and Delete Resource. */
  showStatusActions: boolean;
  /** Whether the status panel shows the read-only Needs Changes notes. */
  showNeedsChangesNotes: boolean;
}

/** Used for any role not listed below, so an unexpected role gets the least access. */
const DEFAULT_CONFIG: EditResourceRoleConfig = {
  // TODO: Replace with variable in the future
  placeholderStatus: ResourceStatus.APPROVED_PUBLISHED,
  usesStaffResources: false,
  backPath: null,
  showStatusActions: false,
  showNeedsChangesNotes: false,
};

const ROLE_CONFIGS: Partial<Record<Status, EditResourceRoleConfig>> = {
  // TODO: Set backPath for admins once their Back destination is decided
  [Status.ADMIN]: {
    // TODO: Replace with variable in the future
    placeholderStatus: ResourceStatus.APPROVED_PUBLISHED,
    usesStaffResources: false,
    backPath: null,
    showStatusActions: true,
    showNeedsChangesNotes: false,
  },
  [Status.COMMUNITY_STAFF]: {
    // TODO: Replace with variable in the future
    placeholderStatus: ResourceStatus.NEEDS_CHANGES,
    usesStaffResources: true,
    backPath: '/my-resources',
    showStatusActions: false,
    showNeedsChangesNotes: true,
  },
};

/**
 * Looks up how the Edit Resource page behaves for a role.
 *
 * @param status - The signed-in user's role.
 * @returns The page settings for that role.
 */
export const getEditResourceRoleConfig = (
  status: Status,
): EditResourceRoleConfig => ROLE_CONFIGS[status] ?? DEFAULT_CONFIG;
