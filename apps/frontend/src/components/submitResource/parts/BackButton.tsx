import { Link } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import BackArrowIcon from './BackArrowIcon';

interface BackButtonProps {
  /** The link's text, e.g. 'Back'. */
  label: string;
  /** The path the link goes to, e.g. '/my-resources'. */
  to: string;
}

/**
 * Link back to a previous page, shown at the top left of the submission form.
 * It's a link rather than a button because it navigates. Chakra's Link renders the react-router link,
 * and `unstyled` leaves styling to submitResource.css.
 *
 * @param props - The link's text and the path it goes to.
 * @returns The back link.
 */
const BackButton = ({ label, to }: BackButtonProps) => {
  return (
    <Link
      asChild
      unstyled
      display="inline-flex"
      alignItems="center"
      flexShrink={0}
      whiteSpace="nowrap"
      className="submit-resource-back"
    >
      <RouterLink to={to}>
        <BackArrowIcon />
        {label}
      </RouterLink>
    </Link>
  );
};

export default BackButton;
