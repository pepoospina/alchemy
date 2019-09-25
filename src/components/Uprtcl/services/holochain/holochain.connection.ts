import { connect } from '@holochain/hc-web-client';

// Auxiliar type for Holochain's get_entry call
export interface EntryResult<T = any> {
  entry: T;
  type: string;
}

const host = 'wss://ws-proxy.herokuapp.com';
// const host = 'ws://localhost:8888';

export class HolochainConnection {
  instanceId: string;
  zome: string;
  connection: (funcName: string, params: any) => Promise<any>;
  connectionReady: Promise<any>;

  constructor(instanceId: string, zome: string) {
    this.instanceId = instanceId;
    this.zome = zome;
    this.connect();
  }

  onSocketClose() {
    console.log('connection with websocket closed, retrying');
    this.connection = null;
    this.connectionReady = Promise.reject();
    const retryInterval = setInterval(() => {
      this.connect();
      if (this.connection) {
        console.log('connection with websocket reestablished');
        clearInterval(retryInterval);
      }
    }, 5000);
  }

  connect() {
    this.connectionReady = new Promise((resolve, reject) => {
      connect(host).then(({ callZome, ws }) => {
        ws.socket.socket.onclose = () => this.onSocketClose();
        this.connection = async (funcName: string, params: any) =>
          await callZome(this.instanceId, this.zome, funcName)(params);
        resolve();
      });
      setTimeout(() => {
        if (!this.connection) {
          reject();
        }
      }, 10000);
    });
  }

  public async call(funcName: string, params: any): Promise<any> {
    await this.ready();
    console.log('[CALL ZOME FUNCTION]:', funcName, params);
    const jsonString = await this.connection(funcName, params);

    const result = JSON.parse(jsonString);

    if (result.Err) throw new Error(JSON.stringify(result.Err));
    if (result.SerializationError) {
      throw new Error(JSON.stringify(result.SerializationError));
    }

    console.log('[RESULT]:', funcName, params, result);
    if (result.Ok) return result.Ok;
    return result;
  }

  public ready(): Promise<void> {
    if (this.connection) return Promise.resolve();
    else return this.connectionReady;
  }

  public parseEntry(entry) {
    let parseable = entry.Ok ? entry.Ok : entry;
    return JSON.parse(parseable.App[1]);
  }

  public parseEntryResult<T>(entry): EntryResult<T> {
    if (!entry.result.Single.meta) return null;
    return {
      entry: {
        id: entry.result.Single.meta.address,
        ...this.parseEntry(entry.result.Single.entry)
      },
      type: entry.result.Single.meta.entry_type.App
    };
  }

  public parseEntries(entryArray: Array<any>) {
    return entryArray.map(entry => this.parseEntry(entry));
  }

  public parseEntriesResults<T>(entryArray: Array<any>): Array<EntryResult<T>> {
    return entryArray.map(entry =>
      this.parseEntryResult(entry.Ok ? entry.Ok : entry)
    );
  }
}
