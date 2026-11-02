import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { isAmplifyConfigured } from '../auth/amplify';
import { confirmPasswordReset, requestPasswordReset } from '../auth/cognito';
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  getPasswordPolicyViolations,
  getPasswordResetErrorMessage,
  isUserNotFoundError,
} from '../auth/passwordReset';
import { useForgotPasswordContext } from '@containers/forgotPassword';

/**
 * Step 2 of the forgot-password flow: the user enters the emailed code and a new password.
 * On success they are sent to the login page; they are not signed in.
 *
 * The email comes from the shared forgot-password state. If it is missing (e.g. after a page refresh)
 * the user is sent back to step 1. Codes and passwords are never logged or put in the URL.
 *
 * @returns A React component representing the "confirm reset" form.
 */
const ForgotPasswordConfirmForm = () => {
  const navigate = useNavigate();
  const { email } = useForgotPasswordContext();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // Disables both buttons while any request is in flight to prevent double submits
  const [busy, setBusy] = useState(false);

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  /**
   * Validates the passwords client-side, then confirms the reset with Cognito.
   * @param event The form submission event.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setNotice(undefined);

    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (getPasswordPolicyViolations(newPassword).length > 0) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset(email, code.trim(), newPassword);
      navigate('/', { replace: true, state: { passwordReset: true } });
    } catch (cause) {
      setError(getPasswordResetErrorMessage(cause));
      setBusy(false);
    }
  };

  /**
   * Asks Cognito to email a fresh code. An unknown account is treated like success.
   */
  const handleResend = async () => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);

    try {
      await requestPasswordReset(email);
      setNotice('A new code was sent.');
    } catch (cause) {
      if (isUserNotFoundError(cause)) {
        setNotice('A new code was sent.');
      } else {
        setError(getPasswordResetErrorMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>Reset your password</h1>
      <p role="status">
        If an account exists for that email, a verification code has been sent.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="reset-email">Email</label>
        <input id="reset-email" type="email" value={email} readOnly />
        <label htmlFor="reset-code">Verification code</label>
        <input
          id="reset-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
        <label htmlFor="reset-new-password">New password</label>
        <input
          id="reset-new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <label htmlFor="reset-confirm-password">Confirm new password</label>
        <input
          id="reset-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        <p>{PASSWORD_REQUIREMENTS_MESSAGE}</p>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button type="submit" disabled={busy || !isAmplifyConfigured()}>
          {busy ? 'Working...' : 'Reset password'}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={busy || !isAmplifyConfigured()}
        >
          Resend code
        </button>
      </form>
      <p>
        <Link to="/">Back to sign in</Link>
      </p>
    </main>
  );
};

export default ForgotPasswordConfirmForm;
