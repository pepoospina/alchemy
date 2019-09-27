import { UprtclService } from '../uprtcl.service';
import { Commit, Perspective, MergeRequest, EthHeadUpdate } from '../../types';

import { EthereumConnection } from './eth.connection';
import { IpfsClient } from './ipfs.client';

import { hashCid, hashText } from './eth.support';
import { CidConfig } from '../cid.config';

/** functions signatures */
const ADD_PERSP     = 'addPerspective(bytes32,bytes32,string,address,string)';
const UPDATE_HEADS  = 'updateHeads((bytes32,string,uint8)[])';
const GET_PERSP     = 'getPerspective(bytes32)';
const UPDATE_OWNER  = 'changeOwner(bytes32,address)';

const INIT_REQUEST      = 'initRequest(bytes32,bytes32,address,uint32,(bytes32,string,uint8)[],address[],string,string)';
const GET_REQUEST       = 'getRequest(bytes32)';
const EXECUTE_REQUEST   = 'executeRequest(bytes32)';
const AUTHORIZE_REQUEST = 'setRequestAuthorized(bytes32,uint8)';
const GET_REQUEST_ID    = 'getRequestId(bytes32,bytes32,uint32)';

export class UprtclEthereum implements UprtclService {
  
  ipfsClient: IpfsClient;
  ethereum: EthereumConnection;
  cidConfig: CidConfig;
  account: string;
  ethReadyCallback: Function;

  constructor(host: string, ipfsConfig: object, ready: Function) {
    this.ipfsClient = new IpfsClient(ipfsConfig);
    this.ethReadyCallback = ready;
    this.ethereum = new EthereumConnection(host, (account) => this.onReady(account));
    this.cidConfig = new CidConfig(
      'base58btc', 1, 'raw', 'sha2-256');
  }

  getCidConfig(): CidConfig {
    return this.cidConfig;
  }

  onReady(account: string) {
    /** set default account and call the readyCallback */
    console.log('[UPRTCL-ETH] onReady', account)
    this.account = account;
    this.ethReadyCallback(account);
  }

  connect() {
    this.ethereum.connect();
  }

  async ready() : Promise<void> {
    return this.ethereum.ready();
  }
  
  async getPerspective(perspectiveId: string): Promise<Perspective> {
    await this.ethereum.ready();

    /** Content addressable part comes from IPFS */
    const perspective: Perspective = await this.ipfsClient.get<Perspective>(perspectiveId);
    perspective.id = perspectiveId;
    console.log(`[ETH] getPerspective ${perspectiveId}`, perspective)
    return perspective;
  }

  async getPerspectiveOwner(perspectiveId: string): Promise<string> {
    await this.ethereum.ready();

    let perspectiveIdHash = await hashCid(perspectiveId);

    const perspective = await this.ethereum.call(
      GET_PERSP, 
      [perspectiveIdHash]);

    console.log(`[ETH] getHead ${perspectiveId}`, perspective);
    
    /** empty string is null */
    return perspective.owner !== '' ? perspective.owner : null;
  }

  async changePerspectiveOwner(perspectiveId: string, newOwner: string) {
    let perspectiveIdHash = await hashCid(perspectiveId);

    await this.ethereum.send(
      UPDATE_OWNER, 
      [perspectiveIdHash, newOwner],
      this.account);
  }

  async getCommit(commitId: string): Promise<Commit> {
    let result = await this.ipfsClient.get<Commit>(commitId);
    console.log(`[ETH] getCommit ${commitId}`, result);
    return result;
  }

  async getHead(perspectiveId: string): Promise<string> {
    await this.ethereum.ready();
    
    let perspectiveIdHash = await hashCid(perspectiveId);

    const perspective = await this.ethereum.call(
      GET_PERSP, 
      [perspectiveIdHash]);

    console.log(`[ETH] getHead ${perspectiveId}`, perspective);
    
    /** empty string is null */
    return perspective.headId !== '' ? perspective.headId : null;
  }

  async getContextPerspectives(context: string): Promise<Perspective[]> {
    await this.ethereum.ready();
    
    let perspectiveOfContextAddedEvents = await this.ethereum.uprtclInstance.getPastEvents(
      'PerspectiveAdded', {
        filter: { contextHash: await hashText(context) },
        fromBlock: 0
      }
    )
    
    let perspectiveIdHashes = perspectiveOfContextAddedEvents.map(e => e.returnValues.perspectiveIdHash);
    console.log(`[ETH] getContextPerspectives of ${context}`, perspectiveIdHashes);

    let promises : Promise<Perspective>[] = perspectiveIdHashes.map(async (perspectiveIdHash) => {
      /** check the creation event to reverse map the cid */
      let perspectiveAddedEvent = await this.ethereum.uprtclInstance.getPastEvents(
        'PerspectiveAdded', {
          filter: { perspectiveIdHash: perspectiveIdHash },
          fromBlock: 0
        }
      )

      /** one event should exist only */
      perspectiveAddedEvent = perspectiveAddedEvent[0];

      console.log(`[ETH] Reverse map perspective hash ${perspectiveIdHash}`, perspectiveAddedEvent);
      return this.getPerspective(perspectiveAddedEvent.returnValues.perspectiveId);
    })

    return Promise.all(promises);
  }

  async createPerspective(perspective: Perspective) : Promise<string> {
    await this.ethereum.ready();

    /** validate */
    if (!perspective.origin) throw new Error('origin cannot be empty');
    if (!perspective.context) throw new Error('context cannot be empty');

    let perspectiveIdOrg = perspective.id;

    /** force fields order */
    let perspectivePlain = {
      'origin': perspective.origin,
      'creatorId': perspective.creatorId,
      'timestamp': perspective.timestamp,
      'context': perspective.context,
      'name': perspective.name
    }

    /** Store the perspective data in the data layer */
    let perspectiveId = await this.ipfsClient.addObject(perspectivePlain, this.cidConfig);
    console.log(`[ETH] createPerspective - added to IPFS`, perspectiveId);

    if (perspectiveIdOrg) {
      if (perspectiveIdOrg != perspectiveId) {
        throw new Error(`perspective ID computed by IPFS ${perspectiveId} is not the same as the input one ${perspectiveIdOrg}.`)
      }
    }
    
    let perspectiveIdHash = await hashCid(perspectiveId);
    let contextIdHash = await hashText(perspective.context);
    
    /** TX is sent, and await to force order (preent head update on an unexisting perspective) */
    await this.ethereum.send(
        ADD_PERSP, 
        [perspectiveIdHash, contextIdHash, '', this.account, perspectiveId],
        this.account);

    console.log(`[ETH] addPerspective - TX minted`);

    return perspectiveId;
  }

  async updateHead(perspectiveId: string, headId: string): Promise<void> {
    let perspectiveIdHash = await hashCid(perspectiveId);

    await this.ethereum.send(
      UPDATE_HEADS, 
      [[{perspectiveIdHash: perspectiveIdHash, headId:headId, executed: 0}]],
      this.account);

  }

  async createCommit(commit: Commit) {
    await this.ethereum.ready();

    let commitIdOrg = commit.id;

    /** force fields order */
    let commitPlain = {
      'creatorId': commit.creatorId,
      'timestamp': commit.timestamp,
      'message': commit.message,
      'parentsIds': commit.parentsIds,
      'dataId': commit.dataId
    }

    /** Store the perspective data in the data layer */
    let commitId = await this.ipfsClient.addObject(commitPlain, this.cidConfig);

    if (commitIdOrg) {
      if (commitIdOrg != commitId) {
        throw new Error('commit ID computed by IPFS is not the same as the input one.')
      }
    }

    console.log(`[ETH] createCommit - added to IPFS`, commitId, commitPlain);
    return commitId;
  }

  async createMergeRequest(request: MergeRequest): Promise<string> {
    /** TX is sent, and await to force order (preent head update on an unexisting perspective) */
    let toPerspectiveIdHash = await hashCid(request.toPerspectiveId)
    let fromPerspectiveIdHash = await hashCid(request.fromPerspectiveId)
    await this.ethereum.send(
      INIT_REQUEST, 
      [ toPerspectiveIdHash, 
        fromPerspectiveIdHash, 
        request.owner, 
        request.nonce, 
        request.headUpdates, 
        request.approvedAddresses,
        request.toPerspectiveId,
        request.fromPerspectiveId
       ],
      this.account);

    /** check logs to get the requestId (batchId) */
    let batchCreatedEvents = await this.ethereum.uprtclInstance.getPastEvents(
      'MergeRequestCreated', {
        filter: { toPerspectiveIdHash: toPerspectiveIdHash, fromPerspectiveIdHash: fromPerspectiveIdHash },
        fromBlock: 0
      }
    )

    let requestId = batchCreatedEvents.filter(e => parseInt(e.returnValues.nonce) === request.nonce)[0].returnValues.requestId;
    return requestId;
  }

  async getMergeRequest(requestId: string): Promise<MergeRequest> {
    
    let request = await this.ethereum.call(
      GET_REQUEST, 
      [ requestId ])

    let requestCreatedEvents = await this.ethereum.uprtclInstance.getPastEvents(
      'MergeRequestCreated', {
        filter: { requestId: requestId },
        fromBlock: 0
      }
    )

    let requestCreatedEvent = requestCreatedEvents.filter(e => e.returnValues.requestId === requestId);

    let requestRead: MergeRequest = {
      id: requestId,
      toPerspectiveId: requestCreatedEvent.returnValues.toPerspectiveId,
      fromPerspectiveId: requestCreatedEvent.returnValues.fromPerspectiveId,
      owner: request.owner,
      status: parseInt(request.status),
      authorized: parseInt(request.authorized),
      approvedAddresses: request.approvedAddresses,
      headUpdates: request.headUpdates.map((update):EthHeadUpdate => {
        return {
          perspectiveIdHash: update.perspectiveIdHash,
          headId: update.headId,
          executed: parseInt(update.executed)
        }
      })
    }

    return requestRead;
  }
  
  async authorizeMergeRequest(requestId: string): Promise<void> {
    return this.ethereum.send(
      AUTHORIZE_REQUEST, 
      [ requestId, 1 ],
      this.account)
  }

  async executeMergeRequest(requestId: string): Promise<void> {
    return this.ethereum.send(
      EXECUTE_REQUEST, 
      [ requestId],
      this.account);
  }

  async getMergeRequestsTo(perspectiveId: string): Promise<MergeRequest[]> {
    await this.ethereum.ready();
    
    let requestsInitialized = await this.ethereum.uprtclInstance.getPastEvents(
      'MergeRequestCreated', {
        filter: { toPerspectiveIdHash: await hashCid(perspectiveId) },
        fromBlock: 0
      }
    )
    
    let getRequestsInitialized = requestsInitialized.map(async (e) : Promise<MergeRequest> => {
      let toPerspectiveIdHash = e.returnValues.toPerspectiveIdHash;
      let fromPerspectiveIdHash = e.returnValues.fromPerspectiveIdHash;
      let nonce = e.returnValues.nonce;

      let requestId = await this.ethereum.call(
        GET_REQUEST_ID, 
        [ toPerspectiveIdHash, fromPerspectiveIdHash, nonce ])

      let ethRequest = await this.ethereum.call(
        GET_REQUEST, 
        [ requestId ]);

      return {
        id: requestId,
        toPerspectiveId: e.returnValues.toPerspectiveId,
        fromPerspectiveId: e.returnValues.fromPerspectiveId,
        approvedAddresses: ethRequest.approvedAddresses,
        authorized: parseInt(ethRequest.authorized),
        status:  parseInt(ethRequest.status),
        headUpdates: ethRequest.headUpdates,
        nonce:  parseInt(nonce),
        owner: ethRequest.owner
      }
    });
    
    return Promise.all(getRequestsInitialized);
  }
}
