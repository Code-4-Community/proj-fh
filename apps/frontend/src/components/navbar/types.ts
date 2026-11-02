/**
 * A single entry in the navbar.
 */
export interface NavbarItem {
  /** Text displayed for the link. */
  label: string;
  /** URL suffix the item leads to, e.g. "/review-queue". */
  path: string;
}
