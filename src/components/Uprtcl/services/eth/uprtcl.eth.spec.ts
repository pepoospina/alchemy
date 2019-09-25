import { UprtclEthereum } from "./uprtcl.eth";
import { Perspective, NodeType, Commit, MergeRequest } from "../../types";
import { DataIpfs } from './../data.ipfs';
import { TextNode } from './../../types';
import { hashCid } from "./eth.support";

var CID = require('cids');
interface ExtendedMatchers extends jest.Matchers<void> {
  toBeValidCid: () => object;
}

const ipfsConfig = {
  host: '127.0.0.1',
  port: 5001,
  protocol: 'http'
};

const ethLocation = 'ws://127.0.0.1:8545';

const initCommit = async (uprtcl: UprtclEthereum, data: DataIpfs, textNode: TextNode) => {
  let dataId = await data.createData(textNode);
  (expect(dataId) as unknown as ExtendedMatchers).toBeValidCid();

  let commit: Commit = {
    creatorId: 'did:123',
    message: 'test',
    parentsIds: [],
    timestamp: Date.now(),
    dataId: dataId
  }

  let commitId = await uprtcl.createCommit(commit);
  (expect(commitId) as unknown as ExtendedMatchers).toBeValidCid();
  return commitId
}

const initPerspective = async (uprtcl: UprtclEthereum, data: DataIpfs, context: string, textNode: TextNode, owner: string) => {
  const perspective: Perspective = {
    origin: 'eth://contractAddress',
    creatorId: 'did:uport:123',
    timestamp: Date.now(),
    context: context,
    name: 'test perspective'
  }

  /** set logged account */
  uprtcl.account = owner;
  let perspectiveId = await uprtcl.createPerspective(perspective);

  let commitId = await initCommit(uprtcl, data, textNode);
  await uprtcl.updateHead(perspectiveId, commitId);

  return perspectiveId;
}

const getData = async (uprtcl: UprtclEthereum, data: DataIpfs, perspectiveId: string): Promise<TextNode> => {
  let headId = await uprtcl.getHead(perspectiveId);
  let commit = await uprtcl.getCommit(headId);
  return data.getData(commit.dataId);
}

describe('Ethereum Uprtcl', () => {

  expect.extend({
    toBeValidCid(received) {
      if (CID.isCID(new CID(received))) {
        return {
          message: () => { return `expected ${received} not to be a valid cid` },
          pass: true
        };
      } else {
        return {
          message: () => { return `expected ${received} to be a valid cid` },
          pass: false
        };
      }
    }
  })

  test('create and update perspective', async () => {
    let uprtcl = new UprtclEthereum(ethLocation, ipfsConfig, () => {});
    let data = new DataIpfs(ipfsConfig);

    await uprtcl.ethereum.ready();

    const perspective: Perspective = {
      origin: 'eth://contractAddress',
      creatorId: 'did:uport:123',
      timestamp: Date.now(),
      context: 'test context',
      name: 'test perspective'
    }
  
    /** set logged account */
    uprtcl.account = uprtcl.ethereum.accounts[0];
    let perspectiveId = await uprtcl.createPerspective(perspective);
    (expect(perspectiveId) as unknown as ExtendedMatchers).toBeValidCid();

    let textNode: TextNode = {
      text: 'sample',
      doc_node_type: NodeType.paragraph,
      links: []
    }

    let dataId = await data.createData(textNode);
    (expect(dataId) as unknown as ExtendedMatchers).toBeValidCid();

    let commit: Commit = {
      creatorId: 'did:123',
      message: 'test',
      parentsIds: [],
      timestamp: Date.now(),
      dataId: dataId
    }

    let commitId = await uprtcl.createCommit(commit);
    (expect(commitId) as unknown as ExtendedMatchers).toBeValidCid();

    await uprtcl.updateHead(perspectiveId, commitId);

    let headRead = await uprtcl.getHead(perspectiveId);
    
    expect(headRead).toEqual(commitId);
  })

  test('branch nested perspectives and merge', async () => {
    let uprtcl = new UprtclEthereum(ethLocation, ipfsConfig, () => {});
    let data = new DataIpfs(ipfsConfig);

    await uprtcl.ethereum.ready();

    let approved = uprtcl.ethereum.accounts[0]; 
    let owner = uprtcl.ethereum.accounts[1];

    let par1Id = await initPerspective(
      uprtcl, data, 'par1-context', 
      {text: 'par 1 - init', doc_node_type: NodeType.paragraph, links:[]}, 
      owner);

    let par2Id = await initPerspective(
      uprtcl, data, 'par1-context', 
      {text: 'par 2 - init', doc_node_type: NodeType.paragraph, links:[]}, 
      owner);

    let titleId = await initPerspective(
      uprtcl, data, 'title-context', 
      {text: 'title - init', doc_node_type: NodeType.title, links:[par1Id, par2Id]}, 
      owner);

    let par1Text: string = 'par 1 - updated';
    let commitPar1Id = await initCommit(uprtcl, data, 
      {text: par1Text, doc_node_type: NodeType.paragraph, links:[]});

    let par2Text: string = 'par 1 - updated';
    let commitPar2Id = await initCommit(uprtcl, data, 
      {text: par2Text, doc_node_type: NodeType.paragraph, links:[]});

    let title1Text: string = 'title - updated';
    let commitTitleId = await initCommit(uprtcl, data, 
      {text: title1Text, doc_node_type: NodeType.title, links:[par1Id, par2Id]});

    let nonce = Math.floor(Math.random() * Math.floor(10000));
    let request: MergeRequest = {
      toPerspectiveId: '',
      fromPerspectiveId: '',
      nonce: nonce,
      owner: owner,
      approvedAddresses: [ approved ],
      headUpdates: [
        {
          headId: commitPar1Id,
          perspectiveIdHash: await hashCid(par1Id),
          executed: 0
        },
        {
          headId: commitPar2Id,
          perspectiveIdHash: await hashCid(par2Id),
          executed: 0
        },
        {
          headId: commitTitleId,
          perspectiveIdHash: await hashCid(titleId),
          executed: 0
        }
      ]
    }

    uprtcl.account = approved;

    let requestId = await uprtcl.createMergeRequest(request);
    let requestRead = await uprtcl.getMergeRequest(requestId);

    expect(requestRead.owner).toEqual(owner);
    expect(requestRead.status).toEqual(1);
    expect(requestRead.authorized).toEqual(0);
    expect(requestRead.approvedAddresses[0]).toEqual(approved);
    expect(requestRead.headUpdates.length).toEqual(3);

    for (let ix = 0; ix < requestRead.headUpdates.length; ix++) {
      expect(requestRead.headUpdates[ix].perspectiveIdHash).toEqual(request.headUpdates[ix].perspectiveIdHash);
      expect(requestRead.headUpdates[ix].headId).toEqual(request.headUpdates[ix].headId);
      expect(requestRead.headUpdates[ix].executed).toEqual(request.headUpdates[ix].executed);
    }

    /** TODO: It throws but I can check that it throws 
     * none of these seems to work ... https://github.com/facebook/jest/issues/1700
    */
    // await uprtcl.executeMergeRequest(requestId);
    // uprtcl.account = approved;
    // await uprtcl.authorizeMergeRequest(requestId);

    uprtcl.account = owner;
    await uprtcl.authorizeMergeRequest(requestId);

    let requestRead2 = await uprtcl.getMergeRequest(requestId);
    expect(requestRead2.owner).toEqual(owner);
    expect(requestRead2.status).toEqual(0);
    expect(requestRead2.authorized).toEqual(1);
    expect(requestRead2.approvedAddresses[0]).toEqual(approved);
    expect(requestRead2.headUpdates.length).toEqual(3);

    for (let ix = 0; ix < requestRead.headUpdates.length; ix++) {
      expect(requestRead2.headUpdates[ix].perspectiveIdHash).toEqual(request.headUpdates[ix].perspectiveIdHash);
      expect(requestRead2.headUpdates[ix].headId).toEqual(request.headUpdates[ix].headId);
      expect(requestRead2.headUpdates[ix].executed).toEqual(request.headUpdates[ix].executed);
    }

    /** TODO: It throws but I can check that it throws 
     * none of these seems to work ... https://github.com/facebook/jest/issues/1700
    */
    // uprtcl.account = owner;
    // await uprtcl.executeMergeRequest(requestId);

    uprtcl.account = approved;
    await uprtcl.executeMergeRequest(requestId);

    let head1Id = await uprtcl.getHead(par1Id);
    let head2Id = await uprtcl.getHead(par2Id);
    let head3Id = await uprtcl.getHead(titleId);

    expect(head1Id).toEqual(commitPar1Id);
    expect(head2Id).toEqual(commitPar2Id);
    expect(head3Id).toEqual(commitTitleId);

    let data1 = await getData(uprtcl, data, par1Id);
    let data2 = await getData(uprtcl, data, par2Id);
    let data3 = await getData(uprtcl, data, titleId);

    expect(data1.text).toEqual(par1Text);
    expect(data2.text).toEqual(par2Text);
    expect(data3.text).toEqual(title1Text);

    expect(data3.links).toEqual([par1Id, par2Id]);
  })
})
