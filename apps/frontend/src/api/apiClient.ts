import axios, { type AxiosInstance } from 'axios';
import { getIdToken } from '../auth/cognito';

/**
 * Represents the authenticated identity of the current user.
 * 
 * sub: The unique identifier for the user.
 * email: The email address of the user.
 */
export type AuthenticatedIdentity = {
  sub: string;
  email: string;
};

import { defaultBaseUrl } from './apiBaseUrl';
import { Resource, Score, Tag } from '../types';

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
   * Retrieves the authenticated identity of the current user.
   * 
   * @returns The authenticated identity (user object) of the current user.
   */
  public async getCurrentIdentity(): Promise<AuthenticatedIdentity> {
    return this.get('/api/auth/me') as Promise<AuthenticatedIdentity>;
  }

   /**
    * Given a resource ID, extract one resource from Resource list and calls Score controller's FindById 
    * and Tag controller's findById methods to return a single merged object containing the resource, its score, and its tags.
    * 
    * @param resourceId the given ID used to extract a resource
    * @returns a single merged object containing the resource, its score, and its tags
    */
  public async getAllResourceInfo(resource_id: number): Promise<unknown> {
    const resources = (await this.post('/api/resources/findById', [resource_id])) as Resource[];
    const resource = resources?.[0];
    if (!resource) throw new Error(`Resource ${resource_id} could not be found`);

    const [scoreResult, tagResult] = await Promise.allSettled([
      this.get(`/api/score/findOneById/${resource.score_id}`) as Promise<Score>,
      resource.tags?.length ? (this.get(`/api/tags/findById?ids=${resource.tags.join(',')}`) as Promise<Tag[]>) : Promise.resolve([])
    ]);

    const failed: Array<'score' | 'tags'> = [];
    const score = scoreResult.status === 'fulfilled' ? scoreResult.value : (failed.push('score'), null);
    const tags = tagResult.status === 'fulfilled' ? tagResult.value : (failed.push('tags'), []);

    return {
      resource,
      score,
      tags,
      partial: failed.length > 0,
      failed
    };
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