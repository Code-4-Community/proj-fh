import { Avatar, Link, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

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
      asChild
      unstyled
      display="flex"
      alignItems="center"
      minWidth={0}
      className="navbar-user"
    >
      <RouterLink to={to} aria-label={`Your profile, ${fullName}`}>
        <Avatar.Root
          unstyled
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          className="navbar-avatar"
          aria-hidden="true"
        >
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar.Root>
        <Text as="span" truncate className="navbar-user-name">
          {fullName}
        </Text>
      </RouterLink>
    </Link>
  );
};

export default NavbarUser;
