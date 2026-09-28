import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn();
const mockAxiosCreate = jest.fn(() => ({ get: mockGet }));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: mockAxiosCreate,
  },
}));
jest.mock('./apiBaseUrl', () => ({
  defaultBaseUrl: 'http://localhost:3000',
}));

const { ApiClient } = require('./apiClient') as typeof import('./apiClient');

describe('ApiClient', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockAxiosCreate.mockClear();
  });

  it('requests the hello endpoint and returns its response data', async () => {
    mockGet.mockResolvedValue({ data: 'Hello from API' });

    const result = await new ApiClient().getHello();

    expect(mockAxiosCreate).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000',
    });
    expect(result).toBe('Hello from API');
    expect(mockGet).toHaveBeenCalledWith('/api');
  });

  it('propagates request errors', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    await expect(new ApiClient().getHello()).rejects.toThrow('Network error');
  });
});