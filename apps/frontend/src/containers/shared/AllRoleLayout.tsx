import { Status } from '../../types';
import { useAuth } from '../../auth/AuthProvider';
import AdminLayout from '@containers/admin/AdminLayout';
import StaffLayout from '@containers/staff/StaffLayout';

/**
 * Layout for pages both roles can open (e.g. the profile): picks the admin or staff navbar from the user's Status.
 * Must be rendered inside a RequireStatus guard that allows both roles.
 *
 * @returns The layout matching the signed-in user's role.
 */
const AllRoleLayout = () => {
  const { user } = useAuth();
  return user?.status === Status.ADMIN ? <AdminLayout /> : <StaffLayout />;
};

export default AllRoleLayout;
