import { DraftService } from '../draft.service';
import { TextNode } from '../../types';
import { DataC1If, DraftC1, DataC1 } from './data.if';
import { Http } from './http';

const http = new Http();

export class DraftCollectiveOne implements DraftService {
  async getDraft(objectId: string): Promise<any> {
    return http.get<DataC1If>(`/draft/${objectId}`).then(dataC1 => {

      if (dataC1 == null) return null;

      switch (dataC1.type) {
        case 'DOCUMENT_NODE':
          const data = <TextNode>JSON.parse(dataC1.jsonData);
          if (data != null) data.id = dataC1.id;
          return data;
      }

      return null;
    });
  }

  async setDraft(objectId: string, draft: any): Promise<void> {
    const draftC1 = new DraftC1();

    draftC1.elementId = objectId;
    draftC1.data = new DataC1();
    draftC1.data.jsonData = JSON.stringify(draft)
    draftC1.data.type = 'DOCUMENT_NODE';

    await http.put('/draft', [draftC1]);
  }
}