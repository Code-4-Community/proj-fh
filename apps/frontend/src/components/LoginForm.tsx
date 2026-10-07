import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { isAmplifyConfigured } from '../auth/amplify';
import {
  completeNewPasswordChallenge,
  signInWithEmailPassword,
} from '../auth/cognito';

/**
 * Temporary login form component without any fancy styling.
 *
 * @returns A React component representing the login form.
 */
const LoginForm: React.FC = () => {
  // navigate function from react-router-dom to programmatically navigate between routes
  const navigate = useNavigate();
  // The email of the user
  const [email, setEmail] = useState('');
  // The password of the user, this is only given to AWS Cognito/Amplify during sign-in
  const [password, setPassword] = useState('');
  // The new password to set when required
  const [newPassword, setNewPassword] = useState('');
  // The confirmation of the new password
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  // Indicates whether the user is required to set a new password, dictated by AWS Cognito
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);
  // The error message to display if sign-in fails
  const [error, setError] = useState<string>();
  // Indicates whether the form is currently processing a sign-in request
  const [busy, setBusy] = useState(false);

  /**
   * Completes the sign-in process by fetching the current identity and navigating to the success page.
   */
  const finishSignIn = async () => {
    const identity = await apiClient.getCurrentIdentity();
    navigate('/success', {
      replace: true,
      state: { email: identity.email },
    });
  };

  /**
   * Handles the form submission for signing in the user.
   * @param event The form submission event.
   * @returns A promise that resolves when the sign-in process is complete.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Prevent the default form submission behavior and start the sign-in process.
    event.preventDefault();

    // Set the current states so they can be communicated to the user through our UI
    setBusy(true);
    setError(undefined);

    try {
      if (requiresNewPassword) {
        if (newPassword !== confirmNewPassword) {
          throw new Error('The new passwords do not match.');
        }
        // Calling Cognito
        await completeNewPasswordChallenge(newPassword);
        setRequiresNewPassword(false);
        setNewPassword('');
        setConfirmNewPassword('');
        await finishSignIn();
        return;
      }

      // Calling Cognito
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
