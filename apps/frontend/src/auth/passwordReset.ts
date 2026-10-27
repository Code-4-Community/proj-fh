/**
 * Helpers shared by the forgot-password screens: the client-side mirror of the Cognito pool's password
 * policy and the mapping from Cognito errors to user-facing messages.
 *
 * Nothing in here may produce output that differs based on whether an account exists.
 */

/**
 * A single requirement of the Cognito user pool's password policy.
 */
export type PasswordRule = {
  description: string;
  /** Returns true when the password satisfies this requirement. */
  test: (password: string) => boolean;
};

/**
 * Minimum password length required by the Cognito pool (see infrastructure/cognito/main.tf).
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * The symbols Cognito counts as "special characters" (including the space character).
 * https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users-passwords.html
 */
const PASSWORD_SYMBOL_PATTERN = /[\^$*.[\]{}()?"!@#%&/\\,><':;|_~`=+\- ]/;

/**
 * The password policy of the Cognito user pool, kept in one place. Keep in sync with the
 * `password_policy` block in infrastructure/cognito/main.tf. Cognito stays the source of truth, so a
 * password that passes these checks can still be rejected with InvalidPasswordException.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    description: `at least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    description: 'one lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    description: 'one uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  { description: 'one number', test: (password) => /[0-9]/.test(password) },
  {
    description: 'one symbol',
    test: (password) => PASSWORD_SYMBOL_PATTERN.test(password),
  },
];

/**
 * Checks a password against the pool's password policy.
 *
 * @param password The candidate password.
 * @returns The descriptions of every requirement the password fails; empty when it is valid.
 */
export const getPasswordPolicyViolations = (password: string): string[] =>
  PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.description,
  );

/**
 * Message listing the full password requirements.
 */
export const PASSWORD_REQUIREMENTS_MESSAGE = `Your password must contain ${PASSWORD_RULES.map(
  (rule) => rule.description,
).join(', ')}.`;

export const INVALID_OR_EXPIRED_CODE_MESSAGE =
  'That code is invalid or has expired.';
export const TOO_MANY_ATTEMPTS_MESSAGE = 'Too many attempts, try again later.';
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Reads the Cognito/Amplify error name (e.g. "CodeMismatchException") off an unknown thrown value.
 */
const getErrorName = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name: unknown }).name)
    : undefined;

/**
 * Whether the error means Cognito has no account for the email. The forgot-password flow treats this
 * like success so the UI never reveals which accounts exist.
 */
export const isUserNotFoundError = (error: unknown): boolean =>
  getErrorName(error) === 'UserNotFoundException';

/**
 * Maps an error thrown while requesting or confirming a password reset to a user-facing message.
 * Unknown-account errors share a message with bad/expired codes so the wording never depends on
 * whether the account exists.
 *
 * @param error The thrown value.
 * @returns The message to display.
 */
export const getPasswordResetErrorMessage = (error: unknown): string => {
  switch (getErrorName(error)) {
    case 'CodeMismatchException':
    case 'ExpiredCodeException':
    case 'UserNotFoundException':
      return INVALID_OR_EXPIRED_CODE_MESSAGE;
    case 'InvalidPasswordException':
      return PASSWORD_REQUIREMENTS_MESSAGE;
    case 'LimitExceededException':
      return TOO_MANY_ATTEMPTS_MESSAGE;
    default:
      return GENERIC_ERROR_MESSAGE;
  }
};
