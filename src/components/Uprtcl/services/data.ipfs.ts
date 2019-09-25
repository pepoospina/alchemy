import { DataService } from './data.service';
import { CidConfig } from './cid.config';
import { IpfsClient } from './eth/ipfs.client';

export class DataIpfs implements DataService {
  ipfsClient: IpfsClient;
  cidConfig: CidConfig;

  getCidConfig(): CidConfig {
    return this.cidConfig;
  }

  setCidConfig(cidConfig: CidConfig): void {
    this.cidConfig = cidConfig;
  }

  constructor(options: object) {
    this.ipfsClient = new IpfsClient(options);
    this.cidConfig = new CidConfig('base58btc', 1, 'raw', 'sha2-256');
  }

  async getData(dataId: string): Promise<any> {
    console.log('[IPFS] geting', dataId);
    const data = await this.ipfsClient.get(dataId);
    console.log('[IPFS] got', dataId, data);
    return data;
  }

  async createData(data: any): Promise<string> {
    let dataIdOrg = data.id;

    let dataPlain = {
      text: data.text,
      type: data.type,
      links: data.links
    };

    const dataId = await this.ipfsClient.addObject(dataPlain, this.cidConfig);
    console.log('[IPFS] createData', data, dataId);

    if (dataIdOrg) {
      if (dataIdOrg != dataId) {
        throw new Error(`Data ID computed by IPFS ${dataId} is 
        not the same as the input one ${dataIdOrg}`);
      }
    }

    return dataId;
  }
}
