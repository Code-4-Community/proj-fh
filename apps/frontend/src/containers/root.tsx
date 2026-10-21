import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@components/LoginForm';
import { getSignedInEmail } from '../auth/cognito';
import { getIdentityAfterSignIn } from '../auth/backendIdentity';

const Root = () => {
  const navigate = useNavigate();

  /**
   * Temporary routing logic just to test login. In the future we're going to
   * actually role-protect routes.
   */
  useEffect(() => {
    getSignedInEmail()
      .then(async (currentEmail) => {
        if (!currentEmail) return;
        const identity = await getIdentityAfterSignIn();
        navigate('/success', {
          replace: true,
          state: { email: identity.email },
        });
      })
      .catch(() => undefined);
  }, [navigate]);

  return <LoginForm />;
};

export default Root;
