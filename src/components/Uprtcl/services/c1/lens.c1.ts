import { LensService } from '../lens.service';
import { Http } from './http';

const http = new Http();

class Lens {
  elementId: string;
  lensType: string;
}

export class LensCollectiveOne implements LensService {
  async getLens(objectId: string): Promise<any> {
    return http.get<String>(`/lens/${objectId}`);
  }

  async setLens(objectId: string, lens: string): Promise<void> {
    const lensDto = new Lens();
    lensDto.elementId = objectId;
    lensDto.lensType = lens;

    await http.put(`/lens/${objectId}`, lensDto);
  }
}