import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { Status } from '../types';

/**
 * Unit tests for CreateUserDto validation.
 * Uses the same options as the controller's ValidationPipe.
 */
const valid = {
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: Status.COMMUNITY_STAFF,
};

/** Returns the names of the fields that failed validation. */
async function invalidFields(body: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateUserDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.map((error) => error.property);
}

describe('CreateUserDto', () => {
  it('accepts a valid body for each invitable role', async () => {
    expect(await invalidFields(valid)).toEqual([]);
    expect(await invalidFields({ ...valid, role: Status.ADMIN })).toEqual([]);
  });

  it('trims and lowercases the email', () => {
    const dto = plainToInstance(CreateUserDto, {
      ...valid,
      email: '  Jane.Doe@Example.COM ',
    });
    expect(dto.email).toBe('jane.doe@example.com');
  });

  it.each(['not-an-email', 'jane@', '@example.com', ''])(
    'rejects the malformed email %p',
    async (email) => {
      expect(await invalidFields({ ...valid, email })).toContain('email');
    },
  );

  it.each(['firstName', 'lastName'])('rejects a missing %s', async (field) => {
    const body: Record<string, unknown> = { ...valid };
    delete body[field];
    expect(await invalidFields(body)).toContain(field);
  });

  it.each(['firstName', 'lastName'])('rejects a blank %s', async (field) => {
    expect(await invalidFields({ ...valid, [field]: '   ' })).toContain(field);
  });

  it.each([Status.PATIENT, 'SUPERUSER', '', undefined])(
    'rejects the role %p',
    async (role) => {
      expect(await invalidFields({ ...valid, role })).toContain('role');
    },
  );

  it('rejects a password in the request', async () => {
    expect(await invalidFields({ ...valid, password: 'hunter2' })).toContain(
      'password',
    );
  });
});