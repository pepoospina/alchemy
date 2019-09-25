export interface LensService {
  getLens(objectId: string): Promise<string>;
  
  setLens(objectId: string, lens: string): Promise<void>;
}
