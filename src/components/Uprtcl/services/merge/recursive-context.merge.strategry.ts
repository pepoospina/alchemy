import { Perspective, TextNode, Commit, HeadUpdate } from '../../types';
import { SimpleMergeStrategy } from './simple.merge.strategy';
import { userService } from '../user/user.service.imp';

type Dictionary<T> = { [key: string]: T };

export class RecursiveContextMergeStrategy extends SimpleMergeStrategy {
  perspectivesByContext: Dictionary<{
    to: string;
    from: string[];
  }>;

  allPerspectives: Dictionary<Perspective>;

  setPerspective(perspective: Perspective, to: boolean): void {
    if (!this.perspectivesByContext[perspective.context]) {
      this.perspectivesByContext[perspective.context] = {
        to: null,
        from: []
      };
    }

    if (to) {
      this.perspectivesByContext[perspective.context].to = perspective.id;
    } else {
      this.perspectivesByContext[perspective.context].from.push(
        perspective.id
      );
    }

    this.allPerspectives[perspective.id] = perspective;
  }

  async readPerspective(perspectiveId: string, to: boolean): Promise<void> {
    const perspective = await this.uprtcl.getPerspective(perspectiveId);
    this.setPerspective(perspective, to);

    const headId = await this.uprtcl.getHead(perspectiveId);
    const head = await this.uprtcl.getCommit(headId);
    const data = await this.data.getData(head.dataId);

    const promises = data.links.map(link =>
      this.readPerspective(link, to)
    );
    await Promise.all(promises);
  }

  async readAllSubcontexts(
    toPerspectiveId: string,
    fromPerspectivesIds: string[]
  ): Promise<void> {
    const promises = fromPerspectivesIds.map(perspectiveId =>
      this.readPerspective(perspectiveId, false)
    );
    promises.push(this.readPerspective(toPerspectiveId, true));

    await Promise.all(promises);
  }

  async mergePerspectives(
    toPerspectiveId: string,
    fromPerspectivesIds: string[]
  ): Promise<HeadUpdate[]> {
    let root = false;
    if (!this.perspectivesByContext) {
      root = true;
      this.perspectivesByContext = {};
      this.allPerspectives = {};
      await this.readAllSubcontexts(toPerspectiveId, fromPerspectivesIds);
    }

    await super.mergePerspectives(
      toPerspectiveId,
      fromPerspectivesIds
    );

    if (root) {
      this.perspectivesByContext = null;
      this.allPerspectives = null;
    }
    return this.updatesList;
  }

  async mergeLinks(
    originalLinks: string[],
    modificationsLinks: string[][]
  ): Promise<string[]> {
    const pIdToCid = async (perspectiveId: string) => {
      if (this.allPerspectives[perspectiveId]) {
        return this.allPerspectives[perspectiveId].context;
      } else {
        const perspective = await this.uprtcl.getPerspective(perspectiveId);
        return perspective.context;
      }
    };

    const originalPromises = originalLinks.map(pIdToCid);
    const modificationsPromises = modificationsLinks.map(links =>
      links.map(pIdToCid)
    );

    const originalContexts = await Promise.all(originalPromises);
    const modificationsContexts = await Promise.all(
      modificationsPromises.map(promises => Promise.all(promises))
    );

    const contextIdLinks = await super.mergeLinks(
      originalContexts,
      modificationsContexts
    );

    const dictionary = this.perspectivesByContext;

    const promises = contextIdLinks.map(async contextId => {
      const perspectivesByContext = dictionary[contextId];

      const needsSubperspectiveMerge =
        perspectivesByContext &&
        perspectivesByContext.to &&
        perspectivesByContext.from &&
        perspectivesByContext.from.length > 0;

      if (needsSubperspectiveMerge) {
        // We need to merge the new perspectives with the original perspective
        await this.mergePerspectives(
          perspectivesByContext.to,
          perspectivesByContext.from
        );

        // The final perspective has not changed
        return perspectivesByContext.to;
      } else {
        const finalPerspectiveId = perspectivesByContext.to
          ? perspectivesByContext.to
          : perspectivesByContext.from[0];

        await this.mergePerspectiveChildren(finalPerspectiveId);

        return finalPerspectiveId;
      }
    });

    const links = await Promise.all(promises);

    return links;
  }

  protected async getPerspectiveData(perspectiveId: string): Promise<TextNode> {
    let headId = await this.uprtcl.getHead(perspectiveId);
    const commit = await this.uprtcl.getCommit(headId);
    return this.data.getData(commit.dataId);
  }

  protected async updatePerspectiveData(
    perspectiveId,
    node: TextNode
  ): Promise<void> {
    let headId = await this.uprtcl.getHead(perspectiveId);
    const newDataId = await this.data.createData(node);
    const commit: Commit = {
      creatorId: userService.getUsername(),
      dataId: newDataId,
      parentsIds: [headId],
      message: 'Update perspective by merge',
      timestamp: Date.now()
    };
    headId = await this.uprtcl.createCommit(commit);
    // await this.uprtcl.updateHead(perspectiveId, headId);
    this.updatesList.push({perspectiveId: perspectiveId, headId: headId});
  }

  private async mergePerspectiveChildren(perspectiveId: string): Promise<void> {
    const data = await this.getPerspectiveData(perspectiveId);

    const mergedLinks = await this.mergeLinks(data.links, [data.links]);

    if (!data.links.every((link, index) => link !== mergedLinks[index])) {
      const node: TextNode = {
        ...data,
        links: data.links
      };

      await this.updatePerspectiveData(perspectiveId, node);
    }
  }
}
