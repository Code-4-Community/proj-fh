import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@components/LoginForm';
import LoadingScreen from '@components/LoadingScreen';
import AnonymousLayout from '@containers/shared/AnonymousLayout';
import { getSignedInEmail } from '../../auth/cognito';
import { getIdentityAfterSignIn } from '../../auth/backendIdentity';
import { Status } from '../../types';

const Root = () => {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  /**
   * Temporary routing logic just to test login. In the future we're going to
   * actually role-protect routes.
   * Shows a loading screen until we know whether to redirect or show the login form.
   */
  useEffect(() => {
    getSignedInEmail()
      .then(async (currentEmail) => {
        if (!currentEmail) {
          setCheckingSession(false);
          return;
        }
        const identity = await getIdentityAfterSignIn();
        if (identity.status === Status.COMMUNITY_STAFF) {
          navigate('/my-resources', { replace: true });
          return;
        }
        if (identity.status === Status.ADMIN) {
          navigate('/home', { replace: true });
          return;
        }
        navigate('/success', {
          replace: true,
          state: { email: identity.email },
        });
      })
      .catch(() => setCheckingSession(false));
  }, [navigate]);

  // The anonymous navbar only appears with the login form, so signed-in users being
  // redirected never see it flash during the session check.
  return checkingSession ? (
    <LoadingScreen />
  ) : (
    <AnonymousLayout>
      <LoginForm />
    </AnonymousLayout>
  );
};

export default Root;
