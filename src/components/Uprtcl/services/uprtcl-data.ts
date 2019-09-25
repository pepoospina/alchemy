import { uprtclMultiplatform, dataMultiplatform, draftService } from './index';
import {
  PerspectiveFull,
  CommitFull,
  TextNodeFull,
  TextNode,
  Perspective,
  Commit,
  TextNodeTree,
  NodeType,
  HeadUpdate
} from './../types';
import { MergeStrategy } from './merge/merge.strategy';
import { RecursiveContextMergeStrategy } from './merge/recursive-context.merge.strategry';
import { DraftRecursiveContentMergeStrategy } from './merge/draft.recursive-content.merge.strategy';

import { userService } from './user/user.service.imp';
import { ipldService } from './ipld';
import { CidConfig } from './cid.config';

export class UprtclData {
  uprtcl = uprtclMultiplatform;
  data = dataMultiplatform;
  draft = draftService;
  mergeService: MergeStrategy<TextNode>;

  constructor(mergeService: MergeStrategy<TextNode>) {
    this.mergeService = mergeService;
  }

  /** Single point to initialize empty text nodes
   *
   * @param _content Text used to initialize the text node
   */
  public initEmptyTextNode(_content: string, _type: NodeType): TextNode {
    return {
      text: _content,
      doc_node_type: _type,
      links: []
    };
  }

  public async toTextNodeTree(perspectiveId: string): Promise<TextNodeTree | null> {
    let draft = await this.getDraft(perspectiveId);
    let data = draft;
    if (!draft) {
      data = await this.getPerspectiveData(perspectiveId);
    }

    if (!data) {
      return null;
    }

    let textNodeTree: TextNodeTree = {
      id: perspectiveId,
      text: data.text,
      type: data.doc_node_type,
      links: []
    };

    /** sync to keep order */
    for (let ix = 0; ix < data.links.length; ix++) {
      let subNode = await this.toTextNodeTree(data.links[ix]);
      if (subNode != null) textNodeTree.links.push(subNode);
    }

    return textNodeTree;
  }

  /** Gets a PerspectiveFull object with the head, context and draft objects nested.
   * It may recurse if the head commit or the draft have a TextNode with links, getting
   * their content as PerspectiveFull recursively.
   *
   * @param perspectiveId the perspective id.
   *
   * @param levels The recursion levels (only get links if `levels > 0`). Will get
   * links of links if `levels = 1`, links of links of links if `levels = 2` and so on.
   * If `levels = -1` the recursion is infinite.
   *
   * @returns A PerspectiveFull with a head, context and draft objects nested. */
  async getPerspectiveFull(
    perspectiveId: string,
    levels: number
  ): Promise<PerspectiveFull> {
    const perspective = await this.uprtcl.getPerspective(perspectiveId);
    const owner = await this.uprtcl.getPerspectiveOwner(perspectiveId);

    /** plain data */
    const perspectiveFull = new PerspectiveFull();
    perspectiveFull.id = perspective.id;
    perspectiveFull.origin = perspective.origin;
    perspectiveFull.creatorId = perspective.creatorId;
    perspectiveFull.owner = owner;
    perspectiveFull.timestamp = perspective.timestamp;
    perspectiveFull.context = perspective.context;
    perspectiveFull.name = perspective.name;

    /** additional data */
    const draft = await this.getDraft(perspectiveId);
    if (draft != null) perspectiveFull.draft = await this.getTextNodeFull(draft, levels);

    const headId = await this.uprtcl.getHead(perspectiveId);
    perspectiveFull.head = await this.getCommitFull(headId, levels);

    console.log(`[UPRTCL-DATA] getPerspectiveFull(${perspectiveId})`, perspectiveFull);

    return perspectiveFull;
  }

  /** Gets a CommitFull object with the TextNode object nested. It may recurse if
   * the TextNode has links, getting their head and data.
   *
   * @param commitId the commit id.
   *
   * @param levels The recursion levels (only get links if `levels > 0`). Will get
   * links of links if `levels = 1`, links of links of links if `levels = 2` and so on.
   * If `levels = -1` the recursion is infinite.
   *
   * @returns A CommitFull with a TextNodeFull object nested . */
  async getCommitFull(commitId: string, levels: number): Promise<CommitFull | null> {
    const commit = await this.uprtcl.getCommit(commitId);
    if (!commit) return null;

    const commitFull = new CommitFull();

    commitFull.id = commit.id;
    commitFull.creatorId = commit.creatorId;
    commitFull.timestamp = commit.timestamp;
    commitFull.message = commit.message;
    commitFull.parentsIds = commit.parentsIds;

    // TODO: why is the data read here and not inside getTextNodeFull? not sure
    const data = await this.data.getData<TextNode>(commit.dataId);
    commitFull.data = await this.getTextNodeFull(data, levels);

    return commitFull;
  }

  /** Fills an existing TextNode with perspectives in place of the links.
   *
   * @param textNode the plain TextNode
   *
   * @param levels The recursion levels (only get links if `levels > 0`). Will get
   * links of links if `levels = 1`, links of links of links if `levels = 2` and so on.
   * If `levels = -1` the recursion is infinite.
   *
   * @returns A TextNodeFull with perspectives in place of links. */
  async getTextNodeFull(
    textNode: TextNode,
    levels: number
  ): Promise<TextNodeFull | null> {
    if (textNode == null) return null;

    const textNodeFull = new TextNodeFull();

    textNodeFull.id = textNode.id;
    textNodeFull.text = textNode.text;
    textNodeFull.doc_node_type = textNode.doc_node_type;

    if (levels == 0) {
      /** stop recursion */
      textNodeFull.links = [];
      return textNodeFull;
    }

    for (let i = 0; i < textNode.links.length; i++) {
      const linkedPerspective = await this.getPerspectiveFull(
        textNode.links[i],
        levels - 1
      );
      if (textNodeFull.links)
        textNodeFull.links.push(linkedPerspective);
    }

    return textNodeFull;
  }

  /** Creates a new context, perspective, and a draft combo
   *
   * @param serviceProvider The service provider in which all the new objects
   * will be created (new perspectives and commits).
   *
   * @param content An optional string used to intialize the draft.
   *
   * @returns The id of the new **perspective**.
   */
  async initContext(
    serviceProvider: string, 
    content: string, 
    type: NodeType, 
    _timestamp: number = Date.now()): Promise<string> {

    /** context being a hash of the user and timestamp is just a suggestion */
    const context = {
      creatorId: userService.getUsername(),
      nonce: 0,
      timestamp: _timestamp
    };

    const contextId = await ipldService.generateCidOrdered(
        context,
        new CidConfig('base58btc', 1, 'raw',    'sha3-256'),
        ['creatorId', 'timestamp', 'nonce']
      );;

    return this.initPerspective(serviceProvider, contextId, content, type);
  }

  /** Creates a new perspective, and a draft combo
   *
   * @param serviceProvider The service provider in which all the new objects
   * will be created.
   *
   * @param contextId The context id of the initiative (cant be null).
   *
   * @param content An optional string used to intialize the draft.
   *
   * @returns The id of the new **perspective** of the context.
   */
  async initPerspective(
    serviceProvider: string,
    context: string,
    content: string,
    type: NodeType
  ): Promise<string> {
    const perspective: Perspective = {
      context: context,
      name: 'first',
      creatorId: userService.getUsername(),
      origin: serviceProvider,
      timestamp: Date.now()
    };

    const perspectiveId = await this.uprtcl.createPerspectiveIn(
      serviceProvider,
      perspective
    );

    await this.setDraft(perspectiveId, this.initEmptyTextNode(content, type));

    return perspectiveId;
  }

  /** Creates a new context, perspective, and draft combo using this.initContext()
   * and adds it as a children of **an existing perspective** at a given index.
   *
   * @param serviceProvider The service provider in which all the new objects
   * will be created.
   *
   * @param perspectiveId The perspective used as reference point.
   *
   * @param index The index in which the new perspective should be added as a child.
   * `index = -1` can be used to add it as the last children.
   *
   * @param content An optional string used to intialize the draft of the new
   * perspective.
   *
   * @returns The id of the new **perspective**.
   */
  async initContextUnder(
    serviceProvider: string,
    perspectiveId: string,
    index: number,
    content: string,
    type: NodeType
  ): Promise<string> {
    const newPerspectiveId = await this.initContext(serviceProvider, content, type);
    await this.insertPerspective(perspectiveId, newPerspectiveId, index);
    return newPerspectiveId;
  }

  /** Inserts an existing perspective (the child) as a child of another existing
   * perspective (the parent) on a given position. It only modifies the current
   * draft of the parent.
   *
   * @param onPerspectiveId The parent perspective id.
   *
   * @param perspectiveId The child perspective id.
   *
   * @param index The index in which the child perspective should be added.
   * `index = -1` can be used to add it as the last children.
   *
   *
   * @returns The id of the new child **perspective**.
   */
  async insertPerspective(
    onPerspectiveId: string,
    perspectiveId: string,
    index: number
  ): Promise<void> {
    let draft = await this.getOrCreateDraft(onPerspectiveId);

    if (draft == null) return;

    if (index != -1) {
      if (0 <= index && index < draft.links.length) {
        draft.links.splice(index, 0, perspectiveId);
      } else if (index == draft.links.length) {
        /* accept length as index and interpret as push */
        draft.links.push(perspectiveId);
      }
    } else {
      draft.links.push(perspectiveId);
    }

    await this.setDraft(onPerspectiveId, draft);

    return;
  }

  /** Remove one child perspective from its parent perspective.
   *
   * @param fromPerspectiveId The parent perspective id.
   *
   * @param index The index of the child to be removed.
   *
   * @returns The id of the new child **perspective**.
   */
  async removePerspective(
    fromPerspectiveId: string,
    index: number
  ): Promise<void> {
    let draft = await this.getOrCreateDraft(fromPerspectiveId);

    if (draft == null) return;

    if (draft.links.length < index)
      throw new Error(`parent dont have a children at index ${index}`);

    /** remove the link */
    draft.links.splice(index, 1);

    /* udpate draft without the link */
    await this.setDraft(fromPerspectiveId, draft);
  }

  /** Wrapper to get the head and the data of a perspective
   *
   * @param perspectiveId The parent perspective id.
   *
   * @returns The data object.
   */
  async getPerspectiveData(perspectiveId: string) {
    const headId = await this.uprtcl.getHead(perspectiveId);
    const head = headId ? await this.uprtcl.getCommit(headId) : null;
    return head ? this.data.getData<TextNode>(head.dataId) : null;
  }

  /** Getter function to get or create a draft of/on a given perspective.
   *
   * @param perspectiveId The parent perspective id.
   *
   * @returns The draft object.
   */
  async getOrCreateDraft(perspectiveId: string): Promise<TextNode | null> {
    let draft = await this.getDraft(perspectiveId);

    if (draft != null) {
      return draft;
    }

    /** get perspective latest data to initialize the draft */
    let data = await this.getPerspectiveData(perspectiveId);

    await this.setDraft(
      perspectiveId,
      data ? data : this.initEmptyTextNode('', NodeType.paragraph)
    );

    return this.getDraft(perspectiveId);
  }

  /** A simple function to safely update the text of a draft without
   * risking to change its type or links.
   *
   * @param perspectiveId The perspective id.
   *
   * @param text The new text.
   *
   * @returns The draft object.
   */
  async setDraftText(perspectiveId: string, _text: string): Promise<TextNode | null> {
    let draft = await this.getOrCreateDraft(perspectiveId);

    if (draft == null) return null;

    draft.text = _text;

    await this.setDraft(perspectiveId, draft);
    return this.getDraft(perspectiveId);
  }

  /** A simple function to safely update the type of a draft without
   * risking to change its text or links.
   *
   * @param perspectiveId The perspective id.
   *
   * @param type The new text.
   *
   * @returns The draft object.
   */
  async setDraftType(
    perspectiveId: string,
    _type: NodeType
  ): Promise<TextNode | null> {
    let draft = await this.getOrCreateDraft(perspectiveId);

    if (draft == null) return null;

    draft.doc_node_type = _type;

    await this.setDraft(perspectiveId, draft);
    return this.getDraft(perspectiveId);
  }

  /** Recursively creates a new perspective out of an existing perspective
   * and of all its children, adding a new commit to each parent to
   * update its links to point to the new perspectives of its children contexts
   *
   * @param serviceProvider The service provider in which all the new objects
   * will be created (new perspectives and commits).
   *
   * @param perspectiveId The Id of the root perspective that will be branched.
   *
   * @param name The name used for all the new perspectives of the root and the
   * children.
   *
   * @returns The id of the new perspective of the root perspective. */
  async createGlobalPerspective(
    serviceProvider: string,
    perspectiveId: string,
    name: string
  ): Promise<string> {
    /** get perspective and include first level links */
    const perspective = await this.uprtcl.getPerspective(perspectiveId);
    const headId = await this.uprtcl.getHead(perspectiveId);
    const head = headId ? await this.uprtcl.getCommit(headId) : null;
    const data = head ? await this.data.getData<TextNode>(head.dataId) : null;
    
    /** global perspectives are created bottom-up in the tree of
     * perspectives */
    const links = data ? data.links : [];
    let newLinks = JSON.parse(JSON.stringify(links));

    for (let i = 0; i < links.length; i++) {
      const childPerspectiveId = links[i];

      /** recursively create a new global perspective of the child */
      const childNewPerspectiveId = await this.createGlobalPerspective(
        serviceProvider,
        childPerspectiveId,
        name
      );

      newLinks[i] = childNewPerspectiveId;
    }

    /** a new commit is created to point to the new perspectives
     * of the children that were just created */
    let newCommitId = headId;

    if ((links.length > 0) && (data != null)) {
      let newNode: TextNode = {
        text: data.text,
        doc_node_type: data.doc_node_type,
        links: newLinks
      };

      const newDataId = await this.data.createDataIn<TextNode>(
        serviceProvider,
        newNode
      );

      const commit: Commit = {
        creatorId: userService.getUsername(),
        dataId: newDataId,
        message: `creating new global perspective ${name}`,
        parentsIds: headId ? [headId] : [],
        timestamp: Date.now()
      };

      newCommitId = await this.uprtcl.createCommitIn(serviceProvider, commit);
    }

    const newPerspective: Perspective = {
      context: perspective.context,
      name: name,
      creatorId: userService.getUsername(),
      origin: serviceProvider,
      timestamp: Date.now()
    };

    const newPerspectiveId = await this.uprtcl.createPerspectiveIn(
      serviceProvider,
      newPerspective
    );

    if (newCommitId) {
      await this.uprtcl.updateHead(newPerspectiveId, newCommitId);
    }

    return newPerspectiveId;
  }

  async changePerspectiveOwnerGlobal(
    perspectiveId: string,
    newOwner: string
  ): Promise<void> {
    
    /** get perspective and include first level links */
    const headId = await this.uprtcl.getHead(perspectiveId);
    const head = headId ? await this.uprtcl.getCommit(headId) : null;
    const data = head ? await this.data.getData<TextNode>(head.dataId) : null;
    
    /** global perspectives are created bottom-up in the tree of
     * perspectives */
    const links = data ? data.links : [];
    let newLinks = JSON.parse(JSON.stringify(links));

    for (let i = 0; i < links.length; i++) {
      const childPerspectiveId = links[i];

      /** recursively create a new global perspective of the child */
      const childNewPerspectiveId = await this.changePerspectiveOwnerGlobal(
        childPerspectiveId,
        newOwner
      );

      newLinks[i] = childNewPerspectiveId;
    }

    await this.uprtcl.changePerspectiveOwner(
      perspectiveId,
      newOwner
    );
  }

  /** Commits the current draft as the head of the perspective and sets the draft
   * as null. Do the same, recursively, for all the children perspectives.
   *
   * @param serviceProvider The service provider in which **the data** is going to be
   * stored.
   *
   * @param perspectiveId The perspective id.
   *
   * @param message The perspective id.
   */
  async commit(
    serviceProvider: string,
    perspectiveId: string,
    message: string = '',
    timestamp: number = Date.now(),
    recurse: boolean = false
  ): Promise<void> {
    let draft = await this.getDraft(perspectiveId);

    /** recursion logic depends on draft or data */
    let applicableData = draft;
    if (applicableData == null) {
      applicableData = await this.getPerspectiveData(perspectiveId);
    }
    if (applicableData == null) {
      return;
    }

    /** recursive call (start bottom up)*/
    if (recurse) {
      let createInLinks = applicableData.links.map(link => {
        this.commit(serviceProvider, link, message, timestamp, recurse);
      });

      await Promise.all(createInLinks);
    }

    /** this perspective commit is done if draft is not null */

    if (!draft) {
      return;
    }

    const dataId = await this.data.createDataIn(serviceProvider, draft);
    /** delete draft */
    await this.draft.removeDraft(perspectiveId);

    const headId = await this.uprtcl.getHead(perspectiveId);
    const parentsIds = headId ? [headId] : [];

    const commit: Commit = {
      creatorId: userService.getUsername(),
      dataId: dataId,
      message: message,
      parentsIds: parentsIds,
      timestamp: timestamp
    };
    const commitId = await this.uprtcl.createCommitIn(serviceProvider, commit);

    await this.uprtcl.updateHead(perspectiveId, commitId);
  }

  public async getDraft(perspectiveId: string): Promise<TextNode | null> {
    const draft = await this.draft.getDraft(perspectiveId);
    return draft ? draft.draft : null;
  }

  public async setDraft(perspectiveId: string, draft: TextNode): Promise<void> {
    const headId = await this.uprtcl.getHead(perspectiveId);

    const commitDraft = {
      commitId: headId,
      draft: draft
    };

    await this.draft.setDraft(perspectiveId, commitDraft);
  }

  private async isAncestorOf(
    ancestorId: string,
    commitId: string
  ): Promise<boolean> {
    if (ancestorId === commitId) return true;

    const commit = await this.uprtcl.getCommit(commitId);

    if (commit.parentsIds.includes(ancestorId)) {
      return true;
    } else {
      /** recursive call */
      for (let ix = 0; ix < commit.parentsIds.length; ix++) {
        if (await this.isAncestorOf(ancestorId, commit.parentsIds[ix])) {
          return true;
        }
      }
    }

    return false;
  }

  private async pullToDraft(
    perspectiveId: string,
    headId: string
  ): Promise<any> {
    // Retrieve the commit with which the draft was created of the perspective
    const draftCommit = await this.draft.getDraft(perspectiveId);

    if (draftCommit && headId !== draftCommit.commitId) {
      // Head and cached head are different, we need to merge its contents together
      const head = await this.uprtcl.getCommit(headId);
      const newData = await this.data.getData<TextNode>(head.dataId);

      let oldData = this.initEmptyTextNode('', NodeType.paragraph);
      if (draftCommit.commitId) {
        const oldCommit = await this.uprtcl.getCommit(draftCommit.commitId);
        oldData = await this.data.getData(oldCommit.dataId);
      }

      const draftMerge = new DraftRecursiveContentMergeStrategy(
        this.uprtcl,
        this.data,
        this.draft
      );
      const newDraft = await draftMerge.mergeData(oldData, [
        newData,
        draftCommit.draft
      ]);

      // Set the new draft with the merged contents to the perspective
      await this.draft.setDraft(perspectiveId, {
        commitId: headId,
        draft: newDraft
      });

      await Promise.all(newDraft.links.map(link => this.pull(link)));
    }
  }

  private async pullHead(perspectiveId: string): Promise<string> {
    const cachedHead = await this.uprtcl.getHead(perspectiveId);
    const headId = await this.uprtcl.getRemoteHead(perspectiveId);

    // Compare the remote
    if (
      cachedHead &&
      headId &&
      !(await this.isAncestorOf(cachedHead, headId))
    ) {
      const mergeCommitId = await this.mergeService.mergeCommits([
        cachedHead,
        headId
      ]);
      await this.uprtcl.updateHead(perspectiveId, mergeCommitId);
      return mergeCommitId;
    }

    return headId;
  }

  public async pull(perspectiveId: string): Promise<void> {
    /** recursive pull all perspectives */
    let draft = await this.getDraft(perspectiveId);

    /** recursion logic depends on draft or data */
    let applicableData = draft;
    if (applicableData == null) {
      applicableData = await this.getPerspectiveData(perspectiveId);
    }
    if (applicableData == null) {
      return;
    }

    const newHeadId = await this.pullHead(perspectiveId);
    await this.pullToDraft(perspectiveId, newHeadId);

    let createInLinks = applicableData.links.map(link => {
      this.pull(link);
    });

    await Promise.all(createInLinks);
  }

  public async merge(
    toPerspective: string,
    fromPerspectives: string[]
  ): Promise<HeadUpdate[]> {
    return this.mergeService.mergePerspectives(toPerspective, fromPerspectives);
  }
}

export const uprtclData = new UprtclData(
  new RecursiveContextMergeStrategy(uprtclMultiplatform, dataMultiplatform)
);
