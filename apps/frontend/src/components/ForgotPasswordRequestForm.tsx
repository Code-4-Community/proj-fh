import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAmplifyConfigured } from '../auth/amplify';
import { requestPasswordReset } from '../auth/cognito';
import {
  getPasswordResetErrorMessage,
  isUserNotFoundError,
} from '../auth/passwordReset';
import { useForgotPasswordContext } from '@containers/forgotPassword';

/**
 * Step 1 of the forgot-password flow: the user enters their email and Cognito emails them a code.
 * The user always advances to step 2 when the request succeeds or the account does not exist, so the
 * screens and timing are identical for real and unknown accounts.
 *
 * @returns A React component representing the "request a code" form.
 */
const ForgotPasswordRequestForm = () => {
  const navigate = useNavigate();
  const { email: savedEmail, setEmail: saveEmail } = useForgotPasswordContext();
  const [email, setEmail] = useState(savedEmail ?? '');
  const [error, setError] = useState<string>();
  // Disables the submit button while a request is in flight to prevent double submits
  const [busy, setBusy] = useState(false);

  /**
   * Requests a code for the entered email, then moves on to step 2.
   * @param event The form submission event.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    const trimmedEmail = email.trim();
    try {
      await requestPasswordReset(trimmedEmail);
    } catch (cause) {
      // An unknown account is treated like success so we never reveal which accounts exist.
      if (!isUserNotFoundError(cause)) {
        setError(getPasswordResetErrorMessage(cause));
        setBusy(false);
        return;
      }
    }

    saveEmail(trimmedEmail);
    navigate('/forgot-password/confirm');
  };

  return (
    <main>
      <h1>Forgot your password?</h1>
      <p>Enter your email and we will send you a verification code.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy || !isAmplifyConfigured()}>
          {busy ? 'Sending code...' : 'Send code'}
        </button>
      </form>
      <p>
        <Link to="/">Back to sign in</Link>
      </p>
    </main>
  );
};

export default ForgotPasswordRequestForm;
