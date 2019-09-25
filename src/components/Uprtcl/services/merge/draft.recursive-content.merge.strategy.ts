import { RecursiveContextMergeStrategy } from './recursive-context.merge.strategry';
import { UprtclService } from '../uprtcl.service';
import { DataService } from '../data.service';
import { DraftService } from '../draft.service';
import { TextNode } from '../../types';

export class DraftRecursiveContentMergeStrategy extends RecursiveContextMergeStrategy {
  draft: DraftService;

  constructor(uprtcl: UprtclService, data: DataService, draft: DraftService) {
    super(uprtcl, data);
    this.draft = draft;
  }

  protected async getPerspectiveData(perspectiveId: string): Promise<TextNode> {
    const draft = await this.draft.getDraft(perspectiveId);
    return draft.draft;
  }

  protected async updatePerspectiveData(
    perspectiveId: string,
    node: TextNode
  ): Promise<void> {
    const headId = await this.uprtcl.getHead(perspectiveId);

    await this.draft.setDraft(perspectiveId, { commitId: headId, draft: node });
  }
}
