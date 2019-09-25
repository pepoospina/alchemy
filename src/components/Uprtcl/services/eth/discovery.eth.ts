import { DiscoveryService } from '../discovery.service';
import { ethServiceProvider } from '../../config';

export class DiscoveryEthereum implements DiscoveryService {
  constructor() {}

  getOwnSource(): Promise<string> {
    return Promise.resolve(ethServiceProvider);
  }

  async getKnownSources(hash: string): Promise<string[]> {
    console.log('[ETH DISCOVERY] I am actually ignoring your hash and returning myself always', { hash })
    let ownsource = await this.getOwnSource();
    return Promise.resolve([ownsource]);
  }
  async addKnownSources(hash: string, sources: string[]): Promise<void> {
    console.log('[ETH DISCOVERY] I cant add known sources, I only know of myself, sorry', { hash, sources })
    return Promise.resolve();
  }
  removeKnownSource(hash: string, source: string): Promise<void> {
    console.error('METHOD NOT IMPLEMENTED' + hash + source);
    return Promise.resolve();
  }
}
