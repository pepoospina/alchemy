import { DiscoveryService } from '../discovery.service';
import { http } from './http';

export class DiscoveryCollectiveOne implements DiscoveryService {
  constructor() {}

  getOwnSource(): Promise<string> {
    return http.get('/discovery/you');
  }

  async getKnownSources(hash: string): Promise<string[]> {
    let sources = await http.get<string[]>(`/discovery/${hash}`);
    console.log(`[DISCOVER-C1]: getting known sources for ${hash}`, sources);      
    return sources;
  }
  
  async addKnownSources(hash: string, sources: string[]): Promise<void> {
    
    if(!sources) {
      console.error('[C1 DISCOVER]: Warning, sources null');
      return Promise.reject('sources is null');
    }

    let nonNullElements = sources.filter(source => source !== null);
    if (nonNullElements.length < sources.length) {
      console.error('[C1 DISCOVER]: Warning, known source null');
    }

    console.log(`[DISCOVER-C1]: adding known sources for ${hash}`, sources);      
    await http.put(`/discovery/${hash}`, sources);
  }
  removeKnownSource(_hash: string, _source: string): Promise<void> {
    return Promise.resolve();
  }
}
