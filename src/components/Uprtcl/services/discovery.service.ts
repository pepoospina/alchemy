export interface DiscoveryService {
  getOwnSource(): Promise<string>;
  getKnownSources(hash: string): Promise<string[]>;
  addKnownSources(hash: string, sources: string[]): Promise<void>;
  removeKnownSource(hash: string, source: string): Promise<void>;
}
