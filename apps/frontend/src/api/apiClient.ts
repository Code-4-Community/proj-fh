import axios, { type AxiosInstance } from 'axios';
import { defaultBaseUrl } from './apiBaseUrl';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: defaultBaseUrl });
  }

  public async getHello(): Promise<string> {
    return this.get('/api') as Promise<string>;
  }

  public async getAllResourceInfo(resourceId: string): Promise<unknown> {
    const resources = await ResourceController.FindByIds([resourceId]);
    const resource = resources?.[0];
    if (!resource) throw new Error(`Resource ${resourceId} could not be found`);

    const [scoreResult, tagResult] = await Promise.allSettled([
      resource.score_id ? ScoreController.FindById(resource.score_id) : Promise.resolve(null),
      resource.tag_ids ? TagController.FindByIds(resource.tag_ids) : Promise.resolve([])
    ]);

    const failed: Array<'score' | 'tags'> = [];

    let score: Score | null = null;
    if (scoreResult.status === 'fulfilled') {
      score = scoreResult.value;
    }
    else
      failed.push('score');

    let tags: Tag[] = [];
    if (tagResult.status === 'fulfilled') {
      tags = tagResult.value;
    }
    else
      failed.push('tags');

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