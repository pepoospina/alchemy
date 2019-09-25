import { CidCompatible } from './cid.service';

export interface DataService<T = any> extends CidCompatible {
  getData(dataId: string): Promise<T>;

  createData(data: T): Promise<string>;
}
