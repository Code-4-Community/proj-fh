/**
 * Whether a staff user is active or has only been invited.
 * Values are the text shown in the status badge.
 */
export enum StaffStatus {
  ACTIVE = 'Active',
  INVITED = 'Invited',
}

/**
 * CSS variant of the status badge, named by appearance rather than the status itself.
 */
export type StaffStatusBadgeVariant = 'filled-light' | 'outlined';

/**
 * Badge variant for each staff status.
 */
export const STAFF_STATUS_BADGE_VARIANT: Record<
  StaffStatus,
  StaffStatusBadgeVariant
> = {
  [StaffStatus.ACTIVE]: 'filled-light',
  [StaffStatus.INVITED]: 'outlined',
};

/**
 * A staff user's role. Local to this feature: the existing Status enum in
 * src/types.ts is not reused. Values match the role values in the users table.
 */
export type StaffRole = 'ADMIN' | 'COMMUNITY_STAFF';

/**
 * Label shown in the Role column for each role.
 */
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Admin',
  COMMUNITY_STAFF: 'Staff',
};

/**
 * A staff user as displayed on the Manage Staff page.
 */
export interface StaffUser {
  /** Identifies this specific user. */
  id: number;
  /** First name, shown before the last name in the Name column. */
  firstName: string;
  /** Last name, shown after the first name in the Name column. */
  lastName: string;
  /** Email address, shown in the Email column. */
  email: string;
  /** Role, shown as its label in the Role column. */
  role: StaffRole;
  /** Date the user was added, shown as mm/dd/yyyy in the Date Added column. */
  dateAdded: Date;
  /** Status, shown as a badge in the Status column. */
  status: StaffStatus;
}

/**
 * Props for the page header.
 */
export interface ManageStaffHeaderProps {
  /** Called when the Add Staff button is clicked. */
  onAddStaffClick: () => void;
}

/**
 * Props for the search bar.
 */
export interface ManageStaffSearchBarProps {
  /** The current search text. */
  value: string;
  /** Called with the new text whenever the input changes. */
  onChange: (value: string) => void;
}

/**
 * Props for the staff table.
 */
export interface ManageStaffTableProps {
  /** Users to render, one per row, in order. */
  staffUsers: StaffUser[];
  /** Called with a user's id when their Remove button is clicked. */
  onRemoveClick: (id: number) => void;
}

/**
 * Props for a single row in the staff table.
 */
export interface ManageStaffTableRowProps {
  /** The user to render in this row. */
  staffUser: StaffUser;
  /** Called with this row's user id when its Remove button is clicked. */
  onRemoveClick: (id: number) => void;
}

/**
 * Props for the status badge.
 */
export interface ManageStaffStatusBadgeProps {
  /** The status to render. */
  status: StaffStatus;
}
