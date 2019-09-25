import { DataService } from '../data.service';
import { TextNode } from '../../types';
import { DataC1If, DataC1 } from './data.if';
import { http } from './http';
import { CidConfig } from '../cid.config';

export class DataCollectiveOne implements DataService {

  cidConfig: CidConfig;

  constructor() {
    this.cidConfig = new CidConfig('base58btc', 1, 'raw', 'sha3-256');
  }

  getCidConfig(): CidConfig {
    return this.cidConfig;
  }

  async getData(dataId: string): Promise<any> {
    return http.get<DataC1If>(`/data/${dataId}`).then(dataC1 => {
      switch (dataC1.type) {
        case 'DOCUMENT_NODE':
          const data = <TextNode>JSON.parse(dataC1.jsonData);
          data.id = dataC1.id;
          return data;
      }
      return null;
    });
  }

  async createData(data: any): Promise<string> {
    const dataC1 = new DataC1();
    dataC1.id = data.id;
    dataC1.type = 'DOCUMENT_NODE';

    /** remove the id  */
    let dataPlain = {
      'text': data.text,
      'doc_node_type': data.doc_node_type,
      'links': data.links
    }

    dataC1.jsonData = JSON.stringify(dataPlain);
    return http.post('/data', dataC1);
  }

}