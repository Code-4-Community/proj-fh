import {
  GENERIC_ERROR_MESSAGE,
  INVALID_OR_EXPIRED_CODE_MESSAGE,
  PASSWORD_REQUIREMENTS_MESSAGE,
  TOO_MANY_ATTEMPTS_MESSAGE,
  getPasswordPolicyViolations,
  getPasswordResetErrorMessage,
  isUserNotFoundError,
} from './passwordReset';

const errorNamed = (name: string) => Object.assign(new Error('boom'), { name });

describe('getPasswordResetErrorMessage', () => {
  it.each([
    'CodeMismatchException',
    'ExpiredCodeException',
    'UserNotFoundException',
  ])('maps %s to the combined invalid-or-expired message', (name) => {
    expect(getPasswordResetErrorMessage(errorNamed(name))).toBe(
      INVALID_OR_EXPIRED_CODE_MESSAGE,
    );
  });

  it('lists the password requirements for InvalidPasswordException', () => {
    const message = getPasswordResetErrorMessage(
      errorNamed('InvalidPasswordException'),
    );
    expect(message).toBe(PASSWORD_REQUIREMENTS_MESSAGE);
    expect(message).toContain('at least 8 characters');
    expect(message).toContain('one symbol');
  });

  it('uses account-neutral wording for LimitExceededException', () => {
    expect(
      getPasswordResetErrorMessage(errorNamed('LimitExceededException')),
    ).toBe(TOO_MANY_ATTEMPTS_MESSAGE);
  });

  it.each([
    new Error('Network error'),
    errorNamed('SomethingElse'),
    'oops',
    null,
    undefined,
  ])('falls back to the generic message for %p', (error) => {
    expect(getPasswordResetErrorMessage(error)).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('isUserNotFoundError', () => {
  it('only matches UserNotFoundException', () => {
    expect(isUserNotFoundError(errorNamed('UserNotFoundException'))).toBe(true);
    expect(isUserNotFoundError(errorNamed('CodeMismatchException'))).toBe(
      false,
    );
    expect(isUserNotFoundError(undefined)).toBe(false);
  });
});

describe('getPasswordPolicyViolations', () => {
  it('accepts a valid password', () => {
    expect(getPasswordPolicyViolations('Valid-password1')).toEqual([]);
  });

  it('flags a password that is too short', () => {
    expect(getPasswordPolicyViolations('Aa1!aaa')).toEqual([
      'at least 8 characters',
    ]);
  });

  it('flags a missing lowercase letter', () => {
    expect(getPasswordPolicyViolations('PASSWORD-1')).toEqual([
      'one lowercase letter',
    ]);
  });

  it('flags a missing uppercase letter', () => {
    expect(getPasswordPolicyViolations('password-1')).toEqual([
      'one uppercase letter',
    ]);
  });

  it('flags a missing number', () => {
    expect(getPasswordPolicyViolations('Password-x')).toEqual(['one number']);
  });

  it('flags a missing symbol', () => {
    expect(getPasswordPolicyViolations('Password12')).toEqual(['one symbol']);
  });

  it('reports every violation at once', () => {
    expect(getPasswordPolicyViolations('')).toHaveLength(5);
  });
});
