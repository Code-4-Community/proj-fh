import { Flex } from '@chakra-ui/react';
import NavbarLogo from './parts/NavbarLogo';
import NavbarLink from './parts/NavbarLink';
import NavbarUser from './parts/NavbarUser';
import { NavbarItem, NavbarUserInfo } from './types';
import './navbar.css';

interface NavbarProps {
  /** Links to render, in order. The navbar has no built-in items. */
  items: NavbarItem[];
  /**
   * The signed-in user, shown on the right. Leave it out for the anonymous variant
   * (logged-out pages), which has no user section and right-aligns the links.
   */
  user?: NavbarUserInfo;
}

/**
 * Top navigation bar: logo, a list of links, and the current user.
 * Fully driven by props so pages decide what links appear.
 *
 * Two variants, chosen by whether `user` is passed:
 * - Signed in: logo, links next to the logo, user section on the right.
 * - Anonymous: logo on the left, links on the right, no user section.
 *
 * @param props - The links to render and, when signed in, the user to show.
 * @returns The rendered navbar.
 */
const Navbar = ({ items, user }: NavbarProps) => (
  <Flex as="nav" align="center" className="navbar" aria-label="Main">
    <NavbarLogo />
    <Flex
      align="center"
      className={user ? 'navbar-links' : 'navbar-links navbar-links-end'}
    >
      {items.map((item) => (
        <NavbarLink key={item.path} {...item} />
      ))}
    </Flex>
    {user && (
      <NavbarUser
        firstName={user.firstName}
        lastName={user.lastName}
        to={user.profilePath}
      />
    )}
  </Flex>
);

export default Navbar;
