import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockAxiosCreate = jest.fn(() => ({ get: mockGet, post: mockPost, interceptors: { request: { use: jest.fn() } }, }));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: mockAxiosCreate,
  },
}));

jest.mock('./apiBaseUrl', () => ({
  defaultBaseUrl: 'http://localhost:3000',
}));

jest.mock('../auth/cognito', () => ({
  getIdToken: jest.fn(async () => null),
}));

const { ApiClient } = require('./apiClient') as typeof import('./apiClient');
const RESOURCES_URL = '/api/resources/findById';
const TAGS_URL = '/api/tags/findById';
const scoreUrl = (id: number) => `/api/scores/findOneById/${id}`;

describe('ApiClient', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
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

  describe('getAllResourceInfo', () => {
    const resource = {
      resource_id: 1,
      score_id: 2,
      name: 'Greater Boston Food Bank',
      category: ['FOOD_ACCESS'],
      description: 'Provides free groceries and hot meals to families in the Greater Boston area.',
      address: '123 Main St, Boston, MA 02115',
      county: 'SUFFOLK',
      zip_code: '02115',
      phone: '(617) 555-0100',
      last_verified_date: '2026-01-15',
      vetting_status: 'verified',
      tags: [1, 4],
    };

    const score = { score_id: 2 };

    const tags = [
      {tag_id: 1, category: 'food_service_type', label: 'Food Pantry' , slug: 'food-pantry' },
      {tag_id: 4, category: 'food_service_type', label: 'Soup Kitchen' , slug: 'soup-kitchen' },
    ];

    type BackendOptions = {
        resources?: unknown;
        resourceError?: Error;
        scoreError?: Error;
        tagsError?: Error;
    };
 
    function mockBackend(options: BackendOptions = {}) {
      mockPost.mockImplementation(async (url: unknown) => {
        if (url === RESOURCES_URL) {
          if (options.resourceError) throw options.resourceError;
          return { data: 'resources' in options ? options.resources : [resource] };
        }
        if (url === TAGS_URL) {
          if (options.tagsError) throw options.tagsError;
          return { data: tags };
        }
        throw new Error(`Unexpected POST ${String(url)}`);
      });
 
      mockGet.mockImplementation(async (url: unknown) => {
        if (url === scoreUrl(2)) {
          if (options.scoreError) throw options.scoreError;
          return { data: score };
        }
        throw new Error(`Unexpected GET ${String(url)}`);
      });
    }
 
    const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
    let client: InstanceType<typeof ApiClient>;
 
    beforeEach(() => {
      client = new ApiClient();
    });
 
    // tests a successful method call at each step
    describe('tests a successful method call', () => {
      it('calls Resource findById with a single-ID list', async () => {
        mockBackend();
        await client.getAllResourceInfo(1);
        expect(mockPost).toHaveBeenCalledWith(RESOURCES_URL, [1]);
      });
 
      it('calls Score FindById and Tag findById using the resource IDs', async () => {
        mockBackend();
        await client.getAllResourceInfo(1);
        expect(mockGet).toHaveBeenCalledWith(scoreUrl(2));
        expect(mockPost).toHaveBeenCalledWith(TAGS_URL, [1, 4]);
      });
 
      it('returns one merged object with no failures', async () => {
        mockBackend();
        const result = await client.getAllResourceInfo(1);
        expect(result).toEqual({
          resource,
          score,
          tags,
          partial: false,
          failed: [],
        });
      });
 
      it('makes the Score and Tag calls in parallel', async () => {
        let resolveScore!: (value: unknown) => void;
        let resolveTags!: (value: unknown) => void;
        mockPost.mockImplementation((url: unknown) =>
          url === RESOURCES_URL
            ? Promise.resolve({ data: [resource] })
            : new Promise((resolve) => {
                resolveTags = resolve;
              }),
        );
        mockGet.mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveScore = resolve;
            }),
        );
 
        const pending = client.getAllResourceInfo(1);
        await flushPromises();
        // both requests are started before either is resolved.
        expect(mockGet).toHaveBeenCalledWith(scoreUrl(2));
        expect(mockPost).toHaveBeenCalledWith(TAGS_URL, [1, 4]);
 
        resolveScore({ data: score });
        resolveTags({ data: tags });
 
        await expect(pending).resolves.toEqual({
          resource,
          score,
          tags,
          partial: false,
          failed: [],
        });
      });
 
      it('skips the Tag call when the resource has no tags', async () => {
        const untagged = { ...resource, tags: [] };
        mockBackend({ resources: [untagged] });

        const result = await client.getAllResourceInfo(1);
 
        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).not.toHaveBeenCalledWith(TAGS_URL, expect.anything());
        expect(result).toEqual({
          resource: untagged,
          score,
          tags: [],
          partial: false,
          failed: [],
        });
      });
    });
 
    describe('tests method when resource call fails', () => {
      it('fails immediately and skips the Score and Tag calls when the request fails', async () => {
        mockBackend({ resourceError: new Error('Network error') });
 
        await expect(client.getAllResourceInfo(1)).rejects.toThrow('Network error');
        expect(mockGet).not.toHaveBeenCalled();
        expect(mockPost).toHaveBeenCalledTimes(1);
      });
 
      it('fails when the backend returns no matching resource', async () => {
        mockBackend({ resources: [] });
 
        await expect(client.getAllResourceInfo(999)).rejects.toThrow(
          'Resource 999 could not be found',
        );
        expect(mockGet).not.toHaveBeenCalled();
        expect(mockPost).toHaveBeenCalledTimes(1);
      });
    });
 
    describe('tests method when score call fails', () => {
      it('returns the resource and tags, flagged as partial', async () => {
        mockBackend({ scoreError: new Error('Score service down') });
 
        const result = await client.getAllResourceInfo(1);
 
        expect(result).toEqual({
          resource,
          score: null,
          tags,
          partial: true,
          failed: ['score'],
        });
      });
    });
 
    describe('tests method when tag call fails', () => {
      it('returns the resource and score, flagged as partial', async () => {
        mockBackend({ tagsError: new Error('tag service down') });
 
        const result = await client.getAllResourceInfo(1);
 
        expect(result).toEqual({
          resource,
          score,
          tags: [],
          partial: true,
          failed: ['tags'],
        });
      });
 
      it('reports both failures when Score and Tag calls both fail', async () => {
        mockBackend({
          scoreError: new Error('Score service down'),
          tagsError: new Error('Tag service down'),
        });
 
        const result = await client.getAllResourceInfo(1);
 
        expect(result).toEqual({
          resource,
          score: null,
          tags: [],
          partial: true,
          failed: ['score', 'tags'],
        });
      });

    });

  });

});
