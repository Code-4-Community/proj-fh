import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import AnonymousLayout from '@containers/shared/AnonymousLayout';

/**
 * Shared state for the two forgot-password steps.
 */
export type ForgotPasswordContext = {
  /** Email entered in step 1, or undefined if step 1 has not been completed. */
  email: string | undefined;
  setEmail: (email: string) => void;
};

/**
 * Hook for the step components to read the shared forgot-password state.
 */
export const useForgotPasswordContext = (): ForgotPasswordContext =>
  useOutletContext<ForgotPasswordContext>();

/**
 * Parent route of the forgot-password flow. It holds the email in memory and shares it with both steps
 * through the outlet context, so the email never appears in the URL or in history state. A page refresh
 * clears it, which sends the user back to step 1.
 *
 * The page is public, so it shows the anonymous navbar (Resources and Log In) above the active step.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState<string>();

  return (
    <AnonymousLayout>
      <Outlet context={{ email, setEmail }} />
    </AnonymousLayout>
  );
};

export default ForgotPassword;
