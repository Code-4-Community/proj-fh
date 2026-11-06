import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@components/navbar/Navbar';
import { NavbarItem } from '@components/navbar/types';
import { getIdentityAfterSignIn } from '../../auth/backendIdentity';
import '../page.css';

/**
 * Shared layout for authenticated pages: the navbar above the matched child route.
 * The user's first and last name come from the signed-in user's backend record.
 *
 * @param items - The navbar links for this role. Each path must match a route defined in app.tsx.
 * @returns The navbar followed by the active child route.
 */
const NavbarLayout = ({ items }: { items: NavbarItem[] }) => {
  const [user, setUser] = useState({ firstName: '', lastName: '' });

  useEffect(() => {
    getIdentityAfterSignIn()
      .then(({ firstName, lastName }) => setUser({ firstName, lastName }))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <Navbar
        items={items}
        firstName={user.firstName}
        lastName={user.lastName}
        profilePath="/profile"
      />
      <main className="page-content">
        <Outlet />
      </main>
    </>
  );
};

export default NavbarLayout;
