import { Commit, Perspective, MergeRequest } from '../../types';
import { UprtclService } from '../uprtcl.service';
import { http } from './http';
import { CidConfig } from '../cid.config';

export class UprtclCollectiveOne implements UprtclService {
  cidConfig: CidConfig;
  
  constructor() {
    this.cidConfig = new CidConfig('base58btc', 1, 'raw',    'sha3-256');
  }

  getCidConfig(): CidConfig {
    return this.cidConfig;
  }

  async getPerspective(perspectiveId: string): Promise<Perspective> {
    return await http.get<Perspective>(`/persp/${perspectiveId}`);
  }

  async getCommit(commitId: string): Promise<Commit> {
    return await http.get<Commit>(`/commit/${commitId}`);
  }

  async getContextPerspectives(context: string): Promise<Perspective[]> {
    return await http.get<Perspective[]>(`/persp?context=${context}`);
  }

  async createPerspective(perspective: Perspective) {
    return await http.post('/persp', perspective);
  }

  async createCommit(commit: Commit) {
    return await http.post('/commit', commit);
  }

  async getHead(perspectiveId: string): Promise<string> {
    return await http.get(`/persp/${perspectiveId}/head`);
  }

  async updateHead(perspectiveId: string, commitId: string): Promise<void> {
    await http.put(`/persp/${perspectiveId}?headId=${commitId}`, {});
  }

  createMergeRequest(request: import("../../types").MergeRequest): Promise<String> {
    console.log(request);
    throw new Error("Method not implemented.");
  }
  getMergeRequest(requestId: string): Promise<import("../../types").MergeRequest> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
  authorizeMergeRequest(requestId: string): Promise<void> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
  executeMergeRequest(requestId: string): Promise<void> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
  async ready() {
    return Promise.resolve();
  }

  connect() {
  }

  async getPerspectiveOwner(perspectiveId: string): Promise<string> {
    console.log(perspectiveId);
    return 'none';
  }

  changePerspectiveOwner(perspectiveId: string, newOwner: string) {
    console.log(perspectiveId, newOwner);
    throw new Error("Method not implemented.");
  }

  async getMergeRequestsTo(perspectiveId: string): Promise<MergeRequest[]> {
    console.log(perspectiveId)
    return [];
  }
}
