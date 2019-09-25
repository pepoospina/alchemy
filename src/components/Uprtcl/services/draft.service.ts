export interface DraftService<T = any> {
  getDraft(objectId: string): Promise<T>;

  setDraft(objectId: string, draft: T): Promise<void>;
}
