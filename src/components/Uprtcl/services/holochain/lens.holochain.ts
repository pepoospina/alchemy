import { LensService } from '../lens.service';
import { HolochainConnection } from './holochain.connection';

export class LensHolochain implements LensService {
  lensZome: HolochainConnection;

  constructor() {
    this.lensZome = new HolochainConnection('test-instance', 'lens');
  }

  getLens(objectId: string): Promise<string> {
    return this.lensZome.call('get_lens', { entry_address: objectId });
  }

  setLens(objectId: string, lens: string): Promise<void> {
    return this.lensZome.call('set_lens', {
      entry_address: objectId,
      lens: lens
    });
  }
}
