import { Icon } from '@chakra-ui/react';

/**
 * Left arrow shown before "Back" in the submission form's back link.
 * Inline SVG because the project has no icon library yet. Decorative, so hidden from screen readers.
 *
 * @returns The icon element.
 */
const BackArrowIcon = () => (
  <Icon asChild className="submit-resource-back-icon" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  </Icon>
);

export default BackArrowIcon;
