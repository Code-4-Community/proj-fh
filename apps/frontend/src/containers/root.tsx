import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@components/LoginForm';
import apiClient from '../api/apiClient';
import { getSignedInEmail } from '../auth/cognito';

const Root: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    getSignedInEmail()
      .then(async (currentEmail) => {
        if (!currentEmail) return;
        const identity = await apiClient.getCurrentIdentity();
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
