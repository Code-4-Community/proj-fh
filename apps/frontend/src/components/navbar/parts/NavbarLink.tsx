import { Link } from '@chakra-ui/react';
import { Link as RouterLink, useMatch } from 'react-router-dom';
import { NavbarItem } from '../types';

/**
 * A navbar link that is styled as active when its path matches the current URL.
 * Chakra's Link renders the react-router link, and `unstyled` leaves styling to navbar.css.
 *
 * @param props - The label and path of the item.
 * @returns The link element.
 */
const NavbarLink = ({ label, path }: NavbarItem) => {
  const isActive = useMatch({ path, end: false }) !== null;

  return (
    <Link
      asChild
      unstyled
      flexShrink={0}
      whiteSpace="nowrap"
      className={isActive ? 'navbar-link navbar-link-active' : 'navbar-link'}
    >
      <RouterLink to={path} aria-current={isActive ? 'page' : undefined}>
        {label}
      </RouterLink>
    </Link>
  );
};

export default NavbarLink;
