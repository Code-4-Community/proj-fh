import { NavbarItem } from '@components/navbar/types';
import NavbarLayout from '@containers/shared/NavbarLayout';

/** Links shown in the staff navbar. Each path must match a route defined in app.tsx. */
const STAFF_NAV_ITEMS: NavbarItem[] = [
  { label: 'My Resources', path: '/my-resources' },
  { label: 'All Resources', path: '/all-resources' },
];

/**
 * Layout for staff pages: the staff navbar above the matched child route.
 *
 * @returns The staff navbar followed by the active child route.
 */
const StaffLayout = () => <NavbarLayout items={STAFF_NAV_ITEMS} />;

export default StaffLayout;
