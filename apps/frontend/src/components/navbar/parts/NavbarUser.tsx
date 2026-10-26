import { Link } from 'react-router-dom';

interface NavbarUserProps {
  /** The user's first name. */
  firstName: string;
  /** The user's last name. */
  lastName: string;
  /** Path the avatar and name link to. */
  to: string;
}

/**
 * The user section of the navbar: a link containing an avatar with the user's initials and their full name.
 * The full name is truncated with an ellipsis if too long.
 *
 * @param props - The user's first and last name and the path to link to.
 * @returns The user section link.
 */
const NavbarUser = ({ firstName, lastName, to }: NavbarUserProps) => {
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;

  return (
    <Link
      to={to}
      className="navbar-user"
      aria-label={`Your profile, ${fullName}`}
    >
      <span className="navbar-avatar" aria-hidden="true">
        {initials}
      </span>
      <span className="navbar-user-name">{fullName}</span>
    </Link>
  );
};

export default NavbarUser;
