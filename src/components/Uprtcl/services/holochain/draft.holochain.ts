import { HolochainConnection } from './holochain.connection';
import { DraftService } from '../draft.service';

export class DraftHolochain<T> implements DraftService<T> {
  draftZome: HolochainConnection;

  constructor() {
    this.draftZome = new HolochainConnection('test-instance', 'draft');
  }

  async getDraft(perspectiveId: string): Promise<T> {
    let draft = await this.draftZome.call('get_draft', {
      entry_address: perspectiveId
    });

    if (draft.message === 'entry has no drafts') {
      draft = null;
    }
    return draft;
  }

  setDraft(objectId: string, draft: any): Promise<void> {
    return this.draftZome.call('set_draft', {
      entry_address: objectId,
      draft: JSON.stringify(draft)
    });
  }
}
