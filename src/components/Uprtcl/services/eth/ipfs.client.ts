import { CidConfig } from "../cid.config";
var ipfsClient = require('ipfs-http-client')

export class IpfsClient {
  client: any;
  
  constructor(options: object) {
    this.client = ipfsClient(options);
  }

  public ready(): Promise<void> {
    return Promise.resolve();
  }

  private getObjectBuffer(object: object): Buffer {
    return Buffer.from(JSON.stringify(object));
  }

  private tryPut(buffer: Buffer, putConfig: object, wait: number, attempt: number): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[IPFS] try put. Attempt: ${attempt}`);
      
      if (attempt > 10) {
        reject();
      }

      /** retry recursively with twice as much the wait time setting */
      let timeout = setTimeout(() => {
        this.tryPut(buffer, putConfig, wait * 2, attempt + 1)
          .then((result:any) => resolve(result))
          .catch(e => reject(e));        
      }, wait)

      this.client.dag.put(buffer, putConfig)
        .then((result: object) => {
          clearTimeout(timeout);
          resolve(result);
        })
    });
  }

  private tryGet(hash: string, wait: number, attempt: number): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[IPFS] trying to get ${hash}. Attempt: ${attempt}`);
      
      if (attempt > 10) {
        reject();
      }

      /** retry recursively with twice as much the wait time setting */
      let timeout = setTimeout(() => {
        this.tryGet(hash, wait * 2, attempt + 1)
          .then((result) => resolve(result))
          .catch(e => reject(e));        
      }, wait)

      this.client.dag.get(hash).then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
        
    });
  }

  public async addObject(object: object, cidConfig: CidConfig): Promise<string> {
    await this.ready();

    let putConfig = { 
      format: cidConfig.codec, 
      hashAlg: cidConfig.type, 
      cidVersion: 
      cidConfig.version 
    }

    let buffer = this.getObjectBuffer(object);

    /** recursively try */
    return this.tryPut(buffer, putConfig, 500, 0)
      .then((result: any)=> {
        let hashString = result.toString(cidConfig.base)
        console.log(`[IPFS] Object stored`, object, { hashString });
        return hashString;
      })
      .catch(e => {
        console.error('[IPFS] error', e);
        throw new Error('Sorry but it seems impossible to store this on IPFS') 
      });
  }

  public async get<T>(hash: string): Promise<T> {
    await this.ready();

    /** recursively try */
    return this.tryGet(hash, 500, 0)
      .then((raw)=> {
        let object = JSON.parse(Buffer.from(raw.value).toString());
        console.log(`[IPFS] Object retrieved ${hash}`, object);
        return object;
      })
      .catch(e => {
        console.error(`[IPFS ]Impossible to get ${hash} from IPFS, returning null`, e);
        return null;
      });
  }
}
