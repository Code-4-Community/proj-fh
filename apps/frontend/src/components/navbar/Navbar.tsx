import NavbarLogo from './parts/NavbarLogo';
import NavbarLink from './parts/NavbarLink';
import NavbarUser from './parts/NavbarUser';
import { NavbarItem } from './types';
import './navbar.css';

interface NavbarProps {
  /** Links to render, in order. The navbar has no built-in items. */
  items: NavbarItem[];
  /** The user's first name, shown in the user section on the right. */
  firstName: string;
  /** The user's last name, shown in the user section on the right. */
  lastName: string;
  /** Where the user section (avatar and name) links to. */
  profilePath: string;
}

/**
 * Top navigation bar: logo, a list of links, and the current user.
 * Fully driven by props so pages decide what links appear.
 *
 * @param props - The links to render, the user's first and last name, and the profile destination.
 * @returns The rendered navbar.
 */
const Navbar = ({ items, firstName, lastName, profilePath }: NavbarProps) => (
  <nav className="navbar" aria-label="Main">
    <NavbarLogo />
    <div className="navbar-links">
      {items.map((item) => (
        <NavbarLink key={item.path} {...item} />
      ))}
    </div>
    <NavbarUser firstName={firstName} lastName={lastName} to={profilePath} />
  </nav>
);

export default Navbar;
