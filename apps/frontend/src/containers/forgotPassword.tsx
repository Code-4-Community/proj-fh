import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { Flex } from '@chakra-ui/react';
import NavbarLogo from '@components/navbar/parts/NavbarLogo';
import '@components/navbar/navbar.css';
import './page.css';

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
 * The page is public, so it gets a logo-only header (the navbar's styling without the staff links or user
 * section, which only make sense once signed in) above the active step.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState<string>();

  return (
    <>
      <Flex as="header" align="center" className="navbar">
        <NavbarLogo />
      </Flex>
      <div className="page-content">
        <Outlet context={{ email, setEmail }} />
      </div>
    </>
  );
};

export default ForgotPassword;
