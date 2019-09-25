import { DataService } from '../data.service';
import { HolochainConnection } from './holochain.connection';
import { CidConfig } from '../cid.config';

export class DataHolochain<T = any> implements DataService<T> {
  proxyZome: HolochainConnection;
  documentsZome: HolochainConnection;
  cidConfig: CidConfig;

  constructor() {
    this.proxyZome = new HolochainConnection('test-instance', 'proxy');
    this.documentsZome = new HolochainConnection('test-instance', 'documents');
    this.cidConfig = new CidConfig('base58btc', 0, 'dag-pb', 'sha2-256');
  }

  getCidConfig(): CidConfig {
    return this.cidConfig;
  }

  async getData(dataId: string): Promise<T> {
    const response = await this.proxyZome.call('get_proxied_entry', {
      address: dataId
    });
    const entry = await this.documentsZome.parseEntryResult<T>(response);

    if (!entry) return null;

    const data = entry.entry;
    return data;
  }

  createData(data: T): Promise<string> {
    return this.documentsZome.call('create_text_node', {
      previous_address: data['id'],
      node: data
    });
  }
}
