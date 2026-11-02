import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@components/navbar/Navbar';
import { NavbarItem } from '@components/navbar/types';
import { getIdentityAfterSignIn } from '../auth/backendIdentity';
import './page.css';

/** Links shown in the navbar. Each path must match a route defined in app.tsx. */
const NAV_ITEMS: NavbarItem[] = [
  { label: 'Review Queue', path: '/review-queue' },
  { label: 'Resources', path: '/resources' },
  { label: 'Manage Staff', path: '/manage-staff' },
];

/**
 * Shared layout for authenticated pages: the navbar above the matched child route.
 * Nav items come from the list above; the user's first and last name from the signed-in user's backend record.
 *
 * @returns The navbar followed by the active child route.
 */
const AppLayout = () => {
  const [user, setUser] = useState({ firstName: '', lastName: '' });

  useEffect(() => {
    getIdentityAfterSignIn()
      .then(({ firstName, lastName }) => setUser({ firstName, lastName }))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <Navbar
        items={NAV_ITEMS}
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

export default AppLayout;
