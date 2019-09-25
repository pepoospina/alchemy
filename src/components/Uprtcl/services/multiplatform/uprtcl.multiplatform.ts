import { UprtclService } from '../uprtcl.service';
import {
  Perspective,
  Commit,
  Dictionary,
  MergeRequest,
} from '../../types';
import { DiscoveryService } from '../discovery.service';
import { CachedMultiplatform } from './cached.multiplatform';
import { UprtclLocal } from '../local/uprtcl.local';
import { CidConfig } from '../cid.config';


export class UprtclMultiplatform extends CachedMultiplatform<UprtclService>
  implements UprtclService {
 
  linksFromPerspective() {
    return [];
  }

  linksFromCommit(commit: Commit) {
    return [commit.dataId, ...commit.parentsIds];
  }

  defaultService: string;

  constructor(
    serviceProviders: Dictionary<{
      service: UprtclService;
      discovery: DiscoveryService;
      connected: boolean;
    }>,
    defaultService: string
  ) {
    super(serviceProviders, new UprtclLocal());
    this.defaultService = defaultService;
  }

  async getPerspective(perspectiveId: string): Promise<Perspective> {
    return await this.cachedDiscover(
      perspectiveId,
      service => service.getPerspective(perspectiveId),
      (service, perspective) => service.createPerspective(perspective),
      this.linksFromPerspective
    );
  }

  async getCommit(commitId: string): Promise<Commit> {
    return await this.cachedDiscover(
      commitId,
      service => service.getCommit(commitId),
      (service, commit) => service.createCommit(commit),
      this.linksFromCommit
    );
  }

  async getCachedContextsPerspectives(
    contextId: string
  ): Promise<Perspective[]> {
    const perspectives = await this.cacheService.getContextPerspectives(
      contextId
    );
    if (perspectives) {
      return perspectives;
    } else {
      return this.getContextPerspectives(contextId);
    }
  }

  async getContextPerspectives(contextId: string): Promise<Perspective[]> {
    const getter = (service: UprtclService) =>
      service.getContextPerspectives(contextId);

    const sourcesGetter = () =>
      this.getFromAllSources(
        contextId,
        getter,
        (perspectives: Perspective[]) => {
          const flat = Array.prototype.concat.apply([], perspectives);
          const links = flat.map(() => this.linksFromPerspective());
          return Array.prototype.concat.apply([], links);
        }
      ).then((perspectives: Perspective[][]) =>
        Array.prototype.concat.apply([], perspectives)
      );

    const clonePerspectives = (
      service: UprtclService,
      perspectives: Perspective[]
    ) => Promise.all(perspectives.map(p => service.createPerspective(p)));

    return this.fallback(sourcesGetter, clonePerspectives, service =>
      service.getContextPerspectives(contextId)
    );
  }

 
  async createPerspective(perspective: Perspective): Promise<string> {
    return this.createPerspectiveIn(this.defaultService, perspective);
  }

  async createPerspectiveIn(
    serviceProvider: string,
    perspective: Perspective
  ): Promise<string> {
    (<UprtclLocal>this.cacheService).setCidConfig(
      this.getServiceProvider(serviceProvider).getCidConfig()
    );

    const initHead = async (perspectiveId: string) => {
      const isHeadCached = await (<UprtclLocal>this.cacheService).headExists(
        perspectiveId
      );

      if (!isHeadCached) {
        await this.cacheService.updateHead(perspectiveId, null);
      }
    };

    return this.optimisticCreate(
      serviceProvider,
      perspective,
      async (service, perspective) => {
        const perspectiveId = await service.createPerspective(perspective);
        await initHead(perspectiveId);
        return perspectiveId;
      },
      this.linksFromPerspective()
    );
  }

  createCommit(commit: Commit): Promise<string> {
    return this.createCommitIn(this.defaultService, commit);
  }

  createCommitIn(serviceProvider: string, commit: Commit): Promise<string> {
    (<UprtclLocal>this.cacheService).setCidConfig(
      this.getServiceProvider(serviceProvider).getCidConfig()
    );
    return this.optimisticCreate(
      serviceProvider,
      commit,
      (service, commit) => service.createCommit(commit),
      this.linksFromCommit(commit)
    );
  }

  async getHead(perspectiveId: string): Promise<string> {
    const isHeadCached = await (<UprtclLocal>this.cacheService).headExists(
      perspectiveId
    );
    if (isHeadCached) {
      return this.cacheService.getHead(perspectiveId);
    } else {
      return this.getRemoteHead(perspectiveId);
    }
  }

  async getRemoteHead(perspectiveId: string): Promise<string> {
    const perspective = await this.getPerspective(perspectiveId);

    if (perspective == null) {
      return null;
    }

    /** head is the special guy. It is always retreived from
     * the perspective origin to prevent attacks. */
    const origin = perspective.origin;

    return this.fallback(
      () =>
        this.getFromSource(
          origin,
          s => s.getHead(perspectiveId),
          headId => [headId]
        ),
      (service, headId) => service.updateHead(perspectiveId, headId),
      service => service.getHead(perspectiveId)
    );
  }

  async updateHead(perspectiveId: string, headId: string): Promise<void> {
    const perspective = await this.getPerspective(perspectiveId);
    const origin = perspective.origin;

    return this.optimisticUpdate(
      origin,
      service => service.updateHead(perspectiveId, headId),
      [headId],
      `Update head of ${perspectiveId}`,
      perspectiveId
    );
  }

  createMergeRequestIn(request: MergeRequest, serviceProvider: string): Promise<String> {
    return this.serviceProviders[serviceProvider].service.createMergeRequest(request);
  }

  createMergeRequest(request: MergeRequest): Promise<String> {
    console.log(request);
    throw new Error("Method not implemented.");
  }
  getMergeRequest(requestId: string): Promise<MergeRequest> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
  authorizeMergeRequest(requestId: string): Promise<void> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
 
  getCidConfig(): CidConfig {
    throw new Error('Method not implemented.');
  }

  async ready() {
    return Promise.resolve();
  }

  connect() {
  }

  async getPerspectiveOwner(perspectiveId: string): Promise<string> {
    const perspective = await this.getPerspective(perspectiveId);
    if (perspective == null) return null;
    const origin = perspective.origin;
    return this.serviceProviders[origin].service.getPerspectiveOwner(perspectiveId);
  }

  async changePerspectiveOwner(perspectiveId: string, newOwner: string) {
    const perspective = await this.getPerspective(perspectiveId);
    if (perspective == null) return null;
    const origin = perspective.origin;
    this.serviceProviders[origin].service.changePerspectiveOwner(perspectiveId, newOwner);
  }

  async getMergeRequestsTo(perspectiveId: string) {
    const perspective = await this.getPerspective(perspectiveId);
    if (perspective == null) return null;
    const origin = perspective.origin;
    return this.serviceProviders[origin].service.getMergeRequestsTo(perspectiveId);
  }

  async executeMergeRequest(requestId: string): Promise<void> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }

  async executeMergeRequestIn(requestId: string, perspectiveId: string): Promise<void> {
    const perspective = await this.getPerspective(perspectiveId);
    if (perspective == null) return null;
    const origin = perspective.origin;
    return this.serviceProviders[origin].service.executeMergeRequest(requestId);
  }

}
