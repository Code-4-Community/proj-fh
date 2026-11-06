import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Root from '@containers/auth/Root';
import NotFound from '@containers/NotFound';
import Test from '@containers/dev/Test';
import Success from '@containers/auth/Success';
import ReviewQueue from '@containers/admin/ReviewQueue';
import ManageResources from '@containers/admin/ManageResources';
import ResourceEdit from '@containers/admin/ResourceEdit';
import ManageStaff from '@containers/admin/ManageStaff';
import Profile from '@containers/shared/Profile';
import AdminLayout from '@containers/admin/AdminLayout';
import StaffLayout from '@containers/staff/StaffLayout';
import AllRoleLayout from '@containers/shared/AllRoleLayout';
import MyResources from '@containers/staff/MyResources';
import AllResources from '@containers/staff/AllResources';
import SubmitHousingResource from '@containers/staff/SubmitHousingResource';
import SubmitFoodResource from '@containers/staff/SubmitFoodResource';
import ForgotPassword from '@containers/auth/forgotPassword';
import ForgotPasswordRequestForm from '@components/ForgotPasswordRequestForm';
import ForgotPasswordConfirmForm from '@components/ForgotPasswordConfirmForm';
import { AuthProvider } from './auth/AuthProvider';
import { RequireStatus } from './auth/RequireStatus';
import { Status } from './types';
import ModalDemo from '@containers/dev/ModalDemo';

/**
 * The main application component that sets up the router and provides it to the React application.
 * This component uses React Router to define the application's routes and their corresponding components.
 *
 * Root route: Renders the main application container (Root component). This is necessary but the components may change
 * Test route: Temporary test component that comes from Scaffolding
 * Success route: Temporary route that displays a success page, right now configured specifically for success in signing in.
 * Modal demo route: Unlinked page for trying the six Modal configurations
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <NotFound />,
  },
  {
    path: '/test',
    element: <Test />,
  },
  {
    path: '/modal-demo',
    element: <ModalDemo />,
  },
  {
    element: <RequireStatus allowed={[Status.ADMIN]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/success', element: <Success /> },
          { path: '/review-queue', element: <ReviewQueue /> },
          { path: '/resources', element: <ManageResources /> },
          { path: '/resources/:resourceId/edit', element: <ResourceEdit /> },
          { path: '/manage-staff', element: <ManageStaff /> },
        ],
      },
    ],
    errorElement: <NotFound />,
  },
  {
    element: <RequireStatus allowed={[Status.COMMUNITY_STAFF]} />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { path: '/my-resources', element: <MyResources /> },
          { path: '/all-resources', element: <AllResources /> },
          {
            path: '/submit-resource/housing',
            element: <SubmitHousingResource />,
          },
          { path: '/submit-resource/food', element: <SubmitFoodResource /> },
        ],
      },
    ],
    errorElement: <NotFound />,
  },
  {
    element: (
      <RequireStatus allowed={[Status.ADMIN, Status.COMMUNITY_STAFF]} />
    ),
    children: [
      {
        element: <AllRoleLayout />,
        children: [{ path: '/profile', element: <Profile /> }],
      },
    ],
    errorElement: <NotFound />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
    children: [
      { index: true, element: <ForgotPasswordRequestForm /> },
      { path: 'confirm', element: <ForgotPasswordConfirmForm /> },
    ],
  }
]);

/**
 * The App component is responsible for initializing the router and providing it to the rest of the application.
 * This component is the entry point of the React application and ensures that the routing is properly configured.
 *
 * @returns The main application component that provides the router to the React application.
 */
export const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
