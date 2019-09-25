import { DiscoveryService } from '../discovery.service';
import { ExtensionsLocal } from './extensions.local';

export class DiscoveryLocal implements DiscoveryService {
  uprtclExtensions = new ExtensionsLocal();

  getOwnSource(): Promise<string> {
    return Promise.resolve('local');
  }

  getKnownSources(hash: string): Promise<string[]> {
    return this.uprtclExtensions.knownSources.get(hash);
  }

  async addKnownSources(hash: string, sources: string[]): Promise<void> {
    if (!sources || sources.length === 0) {
      return;
    }

    const knownSources = await this.getKnownSources(hash);
    const newSources = new Set([].concat(sources).concat(knownSources));

    await this.uprtclExtensions.knownSources.put(
      Array.from(newSources).filter(d => d),
      hash
    );
  }

  async removeKnownSource(hash: string, source: string): Promise<void> {
    let knownSources = await this.getKnownSources(hash);
    
    if (!knownSources) return;

    knownSources = knownSources.filter(s => s !== source);
    if (knownSources.length === 0){
      await this.uprtclExtensions.knownSources.delete(hash);
    } else {
      await this.uprtclExtensions.knownSources.put(knownSources, hash);
    }
  }
}
