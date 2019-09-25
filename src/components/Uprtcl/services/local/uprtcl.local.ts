import { UprtclService } from '../uprtcl.service';

import {
  Perspective as IPerspective,
  Commit as ICommit,
  PropertyOrder,
  MergeRequest
} from '../../types';

import { Perspective, Commit } from './db.objects';

import Dexie from 'dexie';
import { ipldService } from '../ipld';
import { CidConfig } from '../cid.config';
import { CidCompatible } from '../cid.service';

export class UprtclLocal extends Dexie implements UprtclService, CidCompatible {
  
  perspectives: Dexie.Table<Perspective, string>;
  heads: Dexie.Table<string, string>;
  commits: Dexie.Table<Commit, string>;

  currentConfig: CidConfig;

  constructor() {
    super('_prtcl');
    this.version(0.1).stores({
      perspectives: 'id,context',
      heads: '',
      commits: 'id'
    });
    this.perspectives.mapToClass(Perspective);
    this.heads = this.table('heads');
    this.commits.mapToClass(Commit);
  }

  setCidConfig(config: CidConfig) {
    this.currentConfig = config;
  }

  getCidConfig() {
    return this.currentConfig;
  }

  updateConfig(config: CidConfig) {
    this.currentConfig = config;
  }

  getPerspective(perspectiveId: string): Promise<IPerspective> {
    // console.log('[DEXIE] getPerspective', {perspectiveId})
    return this.perspectives.get(perspectiveId);
  }

  getCommit(commitId: string): Promise<ICommit> {
    // console.log('[DEXIE] getCommit', {commitId})
    return this.commits.get(commitId);
  }

  async getContextPerspectives(contextId: string): Promise<IPerspective[]> {
    // console.log('[DEXIE] getContextPerspectives', {contextId})
    return this.perspectives
      .where('contextId')
      .equals(contextId)
      .toArray();
  }

  async createPerspective(perspective: Perspective): Promise<string> {
    if (perspective.id) {
      let valid = await ipldService.validateCid(
        perspective.id,
        perspective,
        PropertyOrder.Perspective
      );
      if (!valid) {
        //throw new Error(`Invalid cid ${perspective.id}`);
      }
    } else {
      perspective.id = await ipldService.generateCidOrdered(
        perspective,
        this.currentConfig,
        PropertyOrder.Perspective
      );
    }
    // console.log('[DEXIE] createPerspective', perspective)
    return this.perspectives.put(perspective);
  }

  async createCommit(commit: Commit): Promise<string> {
    if (commit.id) {
      let valid = await ipldService.validateCid(
        commit.id,
        commit,
        PropertyOrder.Commit
      );
      if (!valid) {
        //throw new Error(`Invalid cid ${commit.id}`);
      }
    } else {
      commit.id = await ipldService.generateCidOrdered(
        commit,
        this.currentConfig,
        PropertyOrder.Commit
      );
    }
    // console.log('[DEXIE] createCommit', commit)
    return this.commits.put(commit);
  }

  async updateHead(perspectiveId: string, headId: string): Promise<void> {
    // console.log('[DEXIE] updateHead', {headId}, {perspectiveId})
    await this.heads.put(headId, perspectiveId);
  }

  async headExists(perspectiveId: string): Promise<boolean> {
    const keys = await this.heads.toCollection().primaryKeys();
    return keys.includes(perspectiveId);
  }

  getHead(perspectiveId: string): Promise<string> {
    // console.log('[DEXIE] getHead', {perspectiveId})
    return this.heads.get(perspectiveId);
  }

  createMergeRequest(request: import("../../types").MergeRequest): Promise<String> {
    console.log(request);
    throw new Error("Method not implemented.");
  }
  getMergeRequest(requestId: string): Promise<import("../../types").MergeRequest> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
  authorizeMergeRequest(requestId: string): Promise<void> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }
  executeMergeRequest(requestId: string): Promise<void> {
    console.log(requestId);
    throw new Error("Method not implemented.");
  }

  async ready() {
    return Promise.resolve();
  }
  
  connect() {
  }

  getPerspectiveOwner(perspectiveId: string): Promise<string> {
    console.log(perspectiveId);
    throw new Error("Method not implemented.");
  }

  changePerspectiveOwner(perspectiveId: string, newOwner: string) {
    console.log(perspectiveId, newOwner);
    throw new Error("Method not implemented.");
  }

  getMergeRequestsTo(perspectiveId: string): Promise<MergeRequest[]> {
    console.log(perspectiveId)
    throw new Error("Method not implemented.");
  }

}
