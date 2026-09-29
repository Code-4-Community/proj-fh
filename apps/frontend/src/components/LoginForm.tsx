import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { isAmplifyConfigured } from '../auth/amplify';
import {
  completeNewPasswordChallenge,
  signInWithEmailPassword,
} from '../auth/cognito';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const finishSignIn = async () => {
    const identity = await apiClient.getCurrentIdentity();
    navigate('/success', {
      replace: true,
      state: { email: identity.email },
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      if (requiresNewPassword) {
        if (newPassword !== confirmNewPassword) {
          throw new Error('The new passwords do not match.');
        }
        await completeNewPasswordChallenge(newPassword);
        setRequiresNewPassword(false);
        setNewPassword('');
        setConfirmNewPassword('');
        await finishSignIn();
        return;
      }

      const result = await signInWithEmailPassword(email, password);
      if (result.kind === 'NEW_PASSWORD_REQUIRED') {
        setRequiresNewPassword(true);
        setPassword('');
        return;
      }

      await finishSignIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Welcome back</h1>
      {!isAmplifyConfigured() && (
        <p role="status">
          Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_APP_CLIENT_ID in the
          root .env using the Cognito Terraform outputs.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {requiresNewPassword ? (
          <>
            <p role="status">
              Your temporary password must be replaced before continuing.
            </p>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy || !isAmplifyConfigured()}>
          {busy
            ? requiresNewPassword
              ? 'Setting password...'
              : 'Signing in...'
            : requiresNewPassword
              ? 'Set password and continue'
              : 'Sign in'}
        </button>
      </form>
    </main>
  );
};

export default LoginForm;
