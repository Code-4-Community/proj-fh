import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@components/navbar/Navbar';
import NavbarLoginIcon from '@components/navbar/parts/NavbarLoginIcon';
import { NavbarItem } from '@components/navbar/types';
import '../page.css';

/** Links shown in the anonymous (logged-out) navbar. Each path must match a route defined in app.tsx. */
const ANONYMOUS_NAV_ITEMS: NavbarItem[] = [
  { label: 'Resources', path: '/public-resources' },
  { label: 'Log In', path: '/', icon: <NavbarLoginIcon /> },
];

interface AnonymousLayoutProps {
  /** Page content to show below the navbar. Defaults to the matched child route when used as a layout route. */
  children?: ReactNode;
}

/**
 * Layout for public pages: the anonymous navbar (Resources and Log In, no user section)
 * above the page content. Doesn't fetch the signed-in user.
 *
 * Use it as a layout route in app.tsx, or wrap content in it directly when a page only
 * shows the navbar some of the time (e.g. Root, which skips it while checking the session).
 *
 * @param props - Optional content to render instead of the matched child route.
 * @returns The anonymous navbar followed by the page content.
 */
const AnonymousLayout = ({ children }: AnonymousLayoutProps) => (
  <>
    <Navbar items={ANONYMOUS_NAV_ITEMS} />
    <main className="page-content">{children ?? <Outlet />}</main>
  </>
);

export default AnonymousLayout;
