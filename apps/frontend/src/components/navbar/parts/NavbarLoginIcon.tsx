import { Icon } from '@chakra-ui/react';

/**
 * Sign-in arrow shown before "Log In" in the anonymous navbar.
 * Inline SVG because the project has no icon library yet. Decorative, so hidden from screen readers.
 *
 * @returns The icon element.
 */
const NavbarLoginIcon = () => (
  <Icon asChild className="navbar-link-icon" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  </Icon>
);

export default NavbarLoginIcon;
