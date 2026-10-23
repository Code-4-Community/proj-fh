import logo from '../../../assets/logo.png';

/**
 * The Fenway Health logo. Purely decorative branding, not a link.
 *
 * @returns The logo image.
 */
const NavbarLogo = () => (
  <div className="navbar-logo">
    <img src={logo} alt="Fenway Health" className="navbar-logo-img" />
  </div>
);

export default NavbarLogo;
