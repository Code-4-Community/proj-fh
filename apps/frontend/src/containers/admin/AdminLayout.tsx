import { NavbarItem } from '@components/navbar/types';
import NavbarLayout from '@containers/shared/NavbarLayout';

/** Links shown in the admin navbar. Each path must match a route defined in app.tsx. */
const ADMIN_NAV_ITEMS: NavbarItem[] = [
  { label: 'Home', path: '/home' },
  { label: 'Review Queue', path: '/review-queue' },
  { label: 'Resources', path: '/resources' },
  { label: 'Manage Staff', path: '/manage-staff' },
];

/**
 * Layout for admin pages: the admin navbar above the matched child route.
 *
 * @returns The admin navbar followed by the active child route.
 */
const AdminLayout = () => <NavbarLayout items={ADMIN_NAV_ITEMS} />;

export default AdminLayout;
