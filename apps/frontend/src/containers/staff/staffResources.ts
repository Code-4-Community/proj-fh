import { Category, ResourceStatus } from '../../types';

/**
 * A resource the signed-in staff member submitted, as the staff pages use it.
 * Shared by My Resources (the table rows) and Edit Resource (looked up by the route's resourceId).
 */
export interface StaffResource {
  /** Matches the :resourceId in the edit route. */
  resourceId: number;
  organizationName: string;
  programName: string;
  category: Category;
  status: ResourceStatus;
  dateSubmitted: Date;
  /** What the admin asked staff to fix. Empty if they asked for nothing. */
  notes: string;
}

// TODO: Replace with variable in the future
export const STAFF_RESOURCES: StaffResource[] = [
  {
    resourceId: 1,
    organizationName: 'Greater Boston Food Bank',
    programName: 'Weekly Pantry',
    category: Category.FOOD_ACCESS,
    status: ResourceStatus.NEEDS_CHANGES,
    dateSubmitted: new Date(2026, 10, 3),
    notes:
      'Please add the pantry’s current hours and confirm the eligibility requirements.',
  },
  {
    resourceId: 2,
    organizationName: 'Pine Street Inn',
    programName: 'Housing Program',
    category: Category.HOUSING,
    status: ResourceStatus.PENDING_REVIEW,
    dateSubmitted: new Date(2026, 10, 5),
    notes: '',
  },
  {
    resourceId: 3,
    organizationName: 'Fenway Community Fridge',
    programName: 'Neighborhood Pantry',
    category: Category.FOOD_ACCESS,
    status: ResourceStatus.APPROVED_PUBLISHED,
    dateSubmitted: new Date(2026, 9, 21),
    notes: '',
  },
  {
    resourceId: 4,
    organizationName: 'Boston Housing Authority',
    programName: 'Rental Assistance',
    category: Category.HOUSING,
    status: ResourceStatus.NEEDS_CHANGES,
    dateSubmitted: new Date(2026, 9, 28),
    notes:
      'The phone number is disconnected. Please provide a working contact number.',
  },
  {
    resourceId: 5,
    organizationName: 'Mass Coalition',
    programName: 'Emergency Shelter Referral',
    category: Category.HOUSING,
    status: ResourceStatus.APPROVED_PUBLISHED,
    dateSubmitted: new Date(2026, 9, 12),
    notes: '',
  },
  {
    resourceId: 6,
    organizationName: 'Project Bread',
    programName: 'Food Source Hotline',
    category: Category.FOOD_ACCESS,
    status: ResourceStatus.PENDING_REVIEW,
    dateSubmitted: new Date(2026, 10, 9),
    notes: '',
  },
];

/**
 * Finds a staff resource by the id in the route.
 *
 * @param resourceId - The route's :resourceId, a string or undefined if the route has none.
 * @returns The matching resource, or undefined if there isn't one.
 */
export const findStaffResource = (
  resourceId: string | undefined,
): StaffResource | undefined =>
  STAFF_RESOURCES.find((resource) => String(resource.resourceId) === resourceId);
