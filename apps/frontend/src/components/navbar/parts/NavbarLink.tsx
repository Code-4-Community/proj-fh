import { NavLink } from 'react-router-dom';
import { NavbarItem } from '../types';

/**
 * A navbar link that is styled as active when its path matches the current URL.
 *
 * @param props - The label and path of the item.
 * @returns The link element.
 */
const NavbarLink = ({ label, path }: NavbarItem) => (
  <NavLink
    to={path}
    className={({ isActive }) =>
      isActive ? 'navbar-link navbar-link-active' : 'navbar-link'
    }
  >
    {label}
  </NavLink>
);

export default NavbarLink;
