import { DraftService } from '../draft.service';
import { ExtensionsLocal } from './extensions.local';

export class DraftLocal<T> implements DraftService<T> {

  uprtclExtensions = new ExtensionsLocal<T>();

  removeDraft(objectId: string): Promise<void> {
    return this.uprtclExtensions.drafts.delete(objectId);
  }

  getDraft(objectId: string): Promise<T> {
    return this.uprtclExtensions.drafts.get(objectId);
  }

  async setDraft(objectId: string, draft: T): Promise<void> {
    delete draft['id'];
    await this.uprtclExtensions.drafts.put(draft, objectId);
  }
}
