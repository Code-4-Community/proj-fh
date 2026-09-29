import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { signOutUser } from '../auth/cognito';

type SuccessLocationState = {
  email?: string;
};

const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as SuccessLocationState | null)?.email;

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/', { replace: true });
  };

  if (!email) {
    return <Navigate to="/" replace />;
  }

  return (
    <main>
      <h1>You&apos;re signed in</h1>
      <p>{email}</p>
      <button onClick={handleSignOut}>Sign out</button>
    </main>
  );
};

export default Success;
