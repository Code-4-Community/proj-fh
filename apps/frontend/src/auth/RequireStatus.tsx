import { Navigate, Outlet } from 'react-router-dom';
import { Status } from '../types';
import { useAuth } from './AuthProvider';

/**
 * Page shown when a signed-in user isn't allowed to see a route, either because they have no
 * database record or because their Status isn't in the route's allowed list.
 */
function Forbidden() {
  return (
    <div>
      <h1>Forbidden</h1>
      <p>You don't have permission to view this page.</p>
    </div>
  );
}

/**
 * Route guard that only renders its child routes for users whose Status is allowed.
 *
 * Use it as a layout route, with the protected pages as its children
 *
 * Reads the auth state from useAuth() and checks it in this order (the first match wins):
 * 1. loading: shows a loading message while the current user is being fetched.
 * 2. error: shows an error message, e.g. if /auth/me returned a 500.
 * 3. unauthenticated: redirects to the login page.
 * 4. forbidden: shows the forbidden page, e.g. if the user has no database record.
 * 5. Otherwise, renders the child routes if the user's Status is allowed, or the forbidden page if not.
 *
 * @param allowed the Statuses that can see the child routes
 * @returns the matching child route, a redirect to login, or a loading, error or forbidden message
 */
export function RequireStatus({ allowed }: { allowed: Status[] }) {
  const { authState, user } = useAuth();

  if (authState === 'loading') {
    return <p>Loading...</p>;
  } else if (authState === 'error') {
    return (
      <p>
        An error occurred while checking your account. Please try again later.
      </p>
    );
  } else if (authState === 'unauthenticated') {
    return <Navigate to="/" replace />;
  } else if (authState === 'forbidden') {
    return <Forbidden />;
  }

  if (user && allowed.includes(user.status)) {
    return <Outlet />;
  }

  return <Forbidden />;
}
