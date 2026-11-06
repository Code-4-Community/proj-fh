import { useNavigate } from 'react-router-dom';
import { signOutUser } from '../../auth/cognito';
import { useAuth } from '../../auth/AuthProvider';

/** Stub page for the signed-in user's profile, with a log out button. */
const Profile = () => {
  const navigate = useNavigate();
  const { clear } = useAuth();

  const handleLogout = async () => {
    await signOutUser();
    clear();
    navigate('/', { replace: true });
  };

  return (
    <>
      <h1>Profile</h1>
      <button onClick={handleLogout}>Log out</button>
    </>
  );
};

export default Profile;
