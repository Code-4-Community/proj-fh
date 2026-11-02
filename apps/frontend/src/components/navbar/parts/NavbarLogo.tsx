import { Flex, Image } from '@chakra-ui/react';
import logo from '../../../assets/logo.png';

/**
 * The Fenway Health logo. Purely decorative branding, not a link.
 *
 * @returns The logo image.
 */
const NavbarLogo = () => (
  <Flex flexShrink={0} className="navbar-logo">
    <Image src={logo} alt="Fenway Health" className="navbar-logo-img" />
  </Flex>
);

export default NavbarLogo;
