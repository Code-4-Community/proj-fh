import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@components/LoginForm';
import LoadingScreen from '@components/LoadingScreen';
import { getSignedInEmail } from '../auth/cognito';
import { getIdentityAfterSignIn } from '../auth/backendIdentity';

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
        navigate('/success', {
          replace: true,
          state: { email: identity.email },
        });
      })
      .catch(() => setCheckingSession(false));
  }, [navigate]);

  return checkingSession ? <LoadingScreen /> : <LoginForm />;
};

export default Root;
