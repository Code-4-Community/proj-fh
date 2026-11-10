import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category, ResourceStatus } from '../types';

const mockGet = jest.fn<(path: string) => Promise<unknown>>();
const mockPost = jest.fn<(path: string, body?: unknown) => Promise<unknown>>();
const mockAxiosCreate = jest.fn(() => ({
  get: mockGet,
  post: mockPost,
  interceptors: { request: { use: jest.fn() } },
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: mockAxiosCreate,
    isAxiosError: (error: unknown) =>
      (error as { isAxiosError?: boolean } | null)?.isAxiosError === true,
  },
}));

jest.mock('./apiBaseUrl', () => ({
  defaultBaseUrl: 'http://localhost:3000',
}));

jest.mock('../auth/cognito', () => ({
  getIdToken: jest.fn(async () => null),
}));

const { ApiClient } = require('./apiClient') as typeof import('./apiClient');
const RESOURCES_URL = '/api/resources/findByIds';
const TAGS_URL = '/api/tags/findByIds';
const FIND_URL = '/api/resources/find';
const scoreUrl = (id: number) => `/api/score/findOneById/${id}`;

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
      description:
        'Provides free groceries and hot meals to families in the Greater Boston area.',
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
      {
        tag_id: 1,
        category: 'food_service_type',
        label: 'Food Pantry',
        slug: 'food-pantry',
      },
      {
        tag_id: 4,
        category: 'food_service_type',
        label: 'Soup Kitchen',
        slug: 'soup-kitchen',
      },
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
          return {
            data: 'resources' in options ? options.resources : [resource],
          };
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

    const flushPromises = () =>
      new Promise((resolve) => setTimeout(resolve, 0));
    let client: InstanceType<typeof ApiClient>;

    beforeEach(() => {
      client = new ApiClient();
    });

    // tests a successful method call at each step
    describe('tests a successful method call', () => {
      it('calls Resource findByIds with a single-ID list', async () => {
        mockBackend();
        await client.getAllResourceInfo(1);
        expect(mockPost).toHaveBeenCalledWith(RESOURCES_URL, [1]);
      });

      it('calls Score FindById and Tag findByIds using the resource IDs', async () => {
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
          url === TAGS_URL
            ? new Promise((resolve) => {
                resolveTags = resolve;
              })
            : Promise.resolve({ data: [resource] }),
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

        await expect(client.getAllResourceInfo(1)).rejects.toThrow(
          'Network error',
        );
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

  describe('getReviewQueueResources', () => {
    /** A backend resource with only the fields the queue reads; override any field per test. */
    const backendResource = (overrides: Record<string, unknown> = {}) => ({
      resource_id: 1,
      organization_name: 'Greater Boston Food Bank',
      program_name: 'Weekly Pantry',
      category: 'food_access',
      review_status: 'pending_review',
      completed_by: 'Jane Doe',
      created_at: '2026-11-01T14:30:00.000Z',
      ...overrides,
    });

    /** An error shaped like the one axios throws for an HTTP error status. */
    const axiosError = (status: number) => ({
      isAxiosError: true,
      response: { status },
    });

    let client: InstanceType<typeof ApiClient>;

    beforeEach(() => {
      client = new ApiClient();
    });

    describe('tests a successful method call', () => {
      it('requests every resource by sending an empty query to find', async () => {
        mockPost.mockResolvedValue({ data: [] });

        await client.getReviewQueueResources();

        expect(mockPost).toHaveBeenCalledWith(FIND_URL, {});
      });

      it("maps a resource to the queue's display shape", async () => {
        mockPost.mockResolvedValue({ data: [backendResource()] });

        const result = await client.getReviewQueueResources();

        expect(result).toEqual([
          {
            resourceId: 1,
            name: 'Greater Boston Food Bank — Weekly Pantry',
            category: Category.FOOD_ACCESS,
            submittedBy: 'Jane Doe',
            dateSubmitted: new Date('2026-11-01T14:30:00.000Z'),
            status: ResourceStatus.PENDING_REVIEW,
          },
        ]);
      });

      it('converts created_at from a string to a Date', async () => {
        mockPost.mockResolvedValue({ data: [backendResource()] });

        const [resource] = await client.getReviewQueueResources();

        expect(resource.dateSubmitted).toBeInstanceOf(Date);
        expect(resource.dateSubmitted.toISOString()).toBe(
          '2026-11-01T14:30:00.000Z',
        );
      });

      it.each([
        ['pending_review', ResourceStatus.PENDING_REVIEW],
        ['approved_published', ResourceStatus.APPROVED_PUBLISHED],
        ['needs_changes', ResourceStatus.NEEDS_CHANGES],
      ])('maps review_status %s to %s', async (reviewStatus, expected) => {
        mockPost.mockResolvedValue({
          data: [backendResource({ review_status: reviewStatus })],
        });

        const [resource] = await client.getReviewQueueResources();

        expect(resource.status).toBe(expected);
      });

      it('keeps a resource with an unrecognized status and gives it a null status', async () => {
        mockPost.mockResolvedValue({
          data: [backendResource({ review_status: 'in_review' })],
        });

        const result = await client.getReviewQueueResources();

        expect(result).toHaveLength(1);
        expect(result[0].status).toBeNull();
      });

      it('leaves out Rejected and Archived resources', async () => {
        mockPost.mockResolvedValue({
          data: [
            backendResource({ resource_id: 1, review_status: 'pending_review' }),
            backendResource({ resource_id: 2, review_status: 'rejected' }),
            backendResource({ resource_id: 3, review_status: 'archived' }),
            backendResource({ resource_id: 4, review_status: 'needs_changes' }),
          ],
        });

        const result = await client.getReviewQueueResources();

        expect(result.map((resource) => resource.resourceId)).toEqual([1, 4]);
      });

      it('sorts resources by ID', async () => {
        mockPost.mockResolvedValue({
          data: [
            backendResource({ resource_id: 3 }),
            backendResource({ resource_id: 1 }),
            backendResource({ resource_id: 2 }),
          ],
        });

        const result = await client.getReviewQueueResources();

        expect(result.map((resource) => resource.resourceId)).toEqual([1, 2, 3]);
      });
    });

    describe('tests method when there are no resources to show', () => {
      it('returns an empty list when find responds with 404', async () => {
        mockPost.mockRejectedValue(axiosError(404));

        await expect(client.getReviewQueueResources()).resolves.toEqual([]);
      });

      it('returns an empty list when every resource is Rejected or Archived', async () => {
        mockPost.mockResolvedValue({
          data: [
            backendResource({ resource_id: 1, review_status: 'rejected' }),
            backendResource({ resource_id: 2, review_status: 'archived' }),
          ],
        });

        await expect(client.getReviewQueueResources()).resolves.toEqual([]);
      });
    });

    describe('tests method when the request fails', () => {
      it.each([400, 500])(
        'rethrows an HTTP %s error instead of returning an empty list',
        async (status) => {
          const error = axiosError(status);
          mockPost.mockRejectedValue(error);

          await expect(client.getReviewQueueResources()).rejects.toBe(error);
        },
      );

      it('rethrows a network error', async () => {
        mockPost.mockRejectedValue(new Error('Network error'));

        await expect(client.getReviewQueueResources()).rejects.toThrow(
          'Network error',
        );
      });
    });
  });
});
