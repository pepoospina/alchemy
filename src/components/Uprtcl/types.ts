export interface Perspective {
  id?: string;
  origin: string;
  creatorId: string;
  timestamp: number;
  context: string;
  name: string;
}

export interface Commit {
  id?: string;
  creatorId: string;
  timestamp: number;
  message: string;
  parentsIds: Array<string>;
  dataId: string;
}

export interface HeadUpdate {
  perspectiveId: string,
  headId: string
}

export interface EthHeadUpdate {
  perspectiveIdHash: string,
  headId: string
  executed: number
}

export interface MergeRequest {
  id?: string;
  toPerspectiveId: string,
  fromPerspectiveId: string,
  owner: string;
  nonce?: number;
  headUpdates: EthHeadUpdate[];
  approvedAddresses: string[];
  status?: number;
  authorized?: number;
}

export const PropertyOrder = {
  Perspective: ['origin', 'creatorId', 'timestamp', 'context', 'name'],
  Commit: ['creatorId', 'timestamp', 'message', 'parentsIds', 'dataId'],
  TextNode: ['text', 'links', 'doc_node_type']
};

export interface TextNode {
  id?: string;
  text: string;
  doc_node_type: string;
  links: Array<string>;
}

export type Dictionary<T> = { [key: string]: T };


export class PerspectiveFull {
  id!: string | undefined;
  origin!: string;
  creatorId!: string;
  owner: string;
  timestamp!: number;
  context!: string;
  name!: string;
  draft!: TextNodeFull | null;
  head!: CommitFull | null;
}

export class CommitFull {
  id?: string;
  creatorId!: string;
  timestamp!: number;
  message!: string;
  parentsIds: Array<String> = [];
  data!: TextNodeFull | null;
}

export class TextNodeFull {
  id?: string;
  text!: string;
  doc_node_type!: string;
  links: Array<PerspectiveFull> | null = [];
}

export class TextNodeTree {
  id?: string;
  text!: string;
  type!: string;
  links: Array<TextNodeTree> = [];
}

export enum NodeType {
  title = 'title',
  paragraph = 'paragraph'
}

export interface Block {
  id: string;
  children: string[];
  status: string;
  content: string;
  style: NodeType;
  serviceProvider: string;
  creatorId: string;
  owner: string;
  draft: TextNodeFull,
  data: TextNodeFull
}
