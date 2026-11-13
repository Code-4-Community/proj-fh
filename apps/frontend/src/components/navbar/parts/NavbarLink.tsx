import { Link } from '@chakra-ui/react';
import { Link as RouterLink, useMatch } from 'react-router-dom';
import { NavbarItem } from '../types';

/**
 * A navbar link that is styled as active when its path matches the current URL.
 * Chakra's Link renders the react-router link, and `unstyled` leaves styling to navbar.css.
 * The root path "/" only counts as active on an exact match, since every URL starts with "/".
 *
 * @param props - The label, path and optional icon of the item.
 * @returns The link element.
 */
const NavbarLink = ({ label, path, icon }: NavbarItem) => {
  const isActive = useMatch({ path, end: path === '/' }) !== null;

  return (
    <Link
      asChild
      unstyled
      display="inline-flex"
      alignItems="center"
      flexShrink={0}
      whiteSpace="nowrap"
      className={isActive ? 'navbar-link navbar-link-active' : 'navbar-link'}
    >
      <RouterLink to={path} aria-current={isActive ? 'page' : undefined}>
        {icon}
        {label}
      </RouterLink>
    </Link>
  );
};

export default NavbarLink;
