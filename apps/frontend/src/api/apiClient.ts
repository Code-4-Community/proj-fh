import axios, { type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';

import { defaultBaseUrl } from './apiBaseUrl';
import { Resource, Score, Tag, User } from '../types';
import { mapReviewStatus } from '../utils/mapReviewStatus';
import {
  REVIEW_QUEUE_HIDDEN_STATUSES,
  type ReviewQueueResource,
  type ReviewQueueResourceResponse,
} from '../components/reviewQueue/types';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: defaultBaseUrl });
    this.axiosInstance.interceptors.request.use(async (config) => {
      const idToken = await getIdToken();
      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`;
      }
      return config;
    });
  }

  public async getHello(): Promise<string> {
    return this.get('/api') as Promise<string>;
  }

  /**
   * Retrieves the authenticated user's database record.
   *
   * @returns The user record of the current user.
   */
  public async getCurrentIdentity(): Promise<User> {
    return this.get('/api/auth/me') as Promise<User>;
  }

  /**
   * Given a resource ID, extract one resource from Resource list and calls Score controller's FindById
   * and Tag controller's findByIds methods to return a single merged object containing the resource, its score, and its tags.
   *
   * @param resourceId the given ID used to extract a resource
   * @returns a single merged object containing the resource, its score, and its tags
   */
  public async getAllResourceInfo(resource_id: number): Promise<unknown> {
    const resources = (await this.post('/api/resources/findByIds', [
      resource_id,
    ])) as Resource[];
    const resource = resources?.[0];
    if (!resource)
      throw new Error(`Resource ${resource_id} could not be found`);

    const [scoreResult, tagResult] = await Promise.allSettled([
      this.get(`/api/score/findOneById/${resource.score_id}`) as Promise<Score>,
      resource.tags?.length
        ? (this.post('/api/tags/findByIds', resource.tags) as Promise<Tag[]>)
        : Promise.resolve([]),
    ]);

    const failed: Array<'score' | 'tags'> = [];
    const score =
      scoreResult.status === 'fulfilled'
        ? scoreResult.value
        : (failed.push('score'), null);
    const tags =
      tagResult.status === 'fulfilled'
        ? tagResult.value
        : (failed.push('tags'), []);

    return {
      resource,
      score,
      tags,
      partial: failed.length > 0,
      failed,
    };
  }

  /**
   * Retrieves the resources shown in the review queue: every resource except Rejected and Archived ones,
   * in the queue's display shape and sorted by ID.
   *
   * @returns the queue's resources, or an empty array if there are none
   */
  public async getReviewQueueResources(): Promise<ReviewQueueResource[]> {
    let resources: ReviewQueueResourceResponse[];
    try {
      // An empty query matches every resource.
      resources = (await this.post(
        '/api/resources/find',
        {},
      )) as ReviewQueueResourceResponse[];
    } catch (error) {
      // find returns 404 when no resources match; that's an empty queue, not a failure.
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }

    return resources
      .map((resource) => ({
        resourceId: resource.resource_id,
        name: `${resource.organization_name} — ${resource.program_name}`,
        category: resource.category,
        status: mapReviewStatus(resource.review_status),
        submittedBy: resource.completed_by,
        // created_at arrives as an ISO string; formatDate needs a Date
        dateSubmitted: new Date(resource.created_at),
      }))
      .filter(
        ({ status }) =>
          status === null || !REVIEW_QUEUE_HIDDEN_STATUSES.includes(status),
      )
      .sort((a, b) => a.resourceId - b.resourceId);
  }

  private async get(path: string): Promise<unknown> {
    return this.axiosInstance.get(path).then((response) => response.data);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    return this.axiosInstance
      .post(path, body)
      .then((response) => response.data);
  }

  private async patch(path: string, body: unknown): Promise<unknown> {
    return this.axiosInstance
      .patch(path, body)
      .then((response) => response.data);
  }

  private async delete(path: string): Promise<unknown> {
    return this.axiosInstance.delete(path).then((response) => response.data);
  }
}

export default new ApiClient();
