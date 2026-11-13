import { ReactNode } from 'react';

/**
 * A single entry in the navbar.
 */
export interface NavbarItem {
  /** Text displayed for the link. */
  label: string;
  /** URL suffix the item leads to, e.g. "/review-queue". */
  path: string;
  /** Optional icon shown to the left of the label, e.g. the sign-in arrow on "Log In". */
  icon?: ReactNode;
}

/**
 * The signed-in user shown on the right side of the navbar.
 * Leaving it out of the navbar renders the anonymous variant.
 */
export interface NavbarUserInfo {
  /** The user's first name. */
  firstName: string;
  /** The user's last name. */
  lastName: string;
  /** Where the user section (avatar and name) links to. */
  profilePath: string;
}
