import { DataService } from '../data.service';
import { CidConfig } from '../cid.config';
import { ipldService } from '../ipld';
import { ExtensionsLocal } from './extensions.local';
import { PropertyOrder } from './../../types';

export class DataLocal<T> implements DataService<T> {
  currentConfig: CidConfig;
  uprtclExtensions = new ExtensionsLocal<T>();

  constructor() {}

  getCidConfig(): CidConfig {
    return this.currentConfig;
  }

  setCidConfig(config: CidConfig) {
    this.currentConfig = config;
  }

  async createData(data: T): Promise<string> {
    if (data['id']) {
      let valid = await ipldService.validateCid(
        data['id'],
        <object>(<unknown>data),
        PropertyOrder.TextNode
      );
      if (!valid) {
        throw new Error(`Invalid cid ${data['id']}`);
      }
    } else {
      data['id'] = await ipldService.generateCidOrdered(
        data,
        this.currentConfig,
        PropertyOrder.TextNode
      );
    }
    // console.log('[DEXIE] createData', data)
    await this.uprtclExtensions.data.put(data);
    return data['id'];
  }

  getData(dataId: string): Promise<T> {
    // console.log('[DEXIE] getData', {dataId})
    return this.uprtclExtensions.data.get(dataId);
  }

}
