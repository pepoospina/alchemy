import Dexie from 'dexie';

export class ExtensionsLocal<T> extends Dexie {
  knownSources: Dexie.Table<string[], string>;
  drafts: Dexie.Table<T, string>;
  data: Dexie.Table<T, string>;

  constructor() {
    super('_prtcl-extensions');
    this.version(0.1).stores({
      drafts: '',
      knownSources: '',
      data: 'id'
    });
    this.knownSources = this.table('knownSources');
    this.drafts = this.table('drafts');
    this.data = this.table('data');
  }

}