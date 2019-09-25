import { MergeStrategy } from './merge.strategy';
import { Commit, HeadUpdate } from '../../types';
import { UprtclService } from '../uprtcl.service';
import { DataService } from '../data.service';

import * as lodash from 'lodash';
import findMostRecentCommonAncestor from './common.ancestor';
import { DiffUtils } from './diff.utils';
import { Diff } from 'diff-match-patch-ts';
import { UprtclUtils } from '../uprtcl.utils';
import { userService } from '../user/user.service.imp';

export class BaseMergeStrategy<T> implements MergeStrategy<T> {
  updatesList: HeadUpdate[];
  uprtcl: UprtclService;
  data: DataService<T>;
  utils: UprtclUtils;
  
  constructor(uprtcl: UprtclService, data: DataService) {
    this.uprtcl = uprtcl;
    this.data = data;
    this.utils = new UprtclUtils(uprtcl);
  }

  async mergePerspectives(
    toPerspectiveId: string,
    fromPerspectivesIds: string[]
  ): Promise<HeadUpdate[]> {
    /** initialize list */
    this.updatesList = [];
    
    const commitsIds = [toPerspectiveId, ...fromPerspectivesIds].map(id =>
      this.uprtcl.getHead(id)
    );

    const headsIds = await Promise.all(commitsIds);

    const toHeadId = headsIds.shift();
    
    const areAncestorsPromises = headsIds.map(headId =>
      this.utils.isAncestorOf(headId, toHeadId)
    );
    const areAncestors = await Promise.all(areAncestorsPromises);
    if (areAncestors.every(isAncestor => isAncestor)) {
      // All commits to merge from are ancestors of the current one, do nothing
      return this.updatesList;
    }

    const mergeCommitId = await this.mergeCommits([toHeadId, ...headsIds]);

    // await this.uprtcl.updateHead(toPerspectiveId, mergeCommitId);
    this.updatesList.push({perspectiveId: toPerspectiveId, headId: mergeCommitId});

    return this.updatesList;
  }

  async mergeCommits(commitsIds: string[]): Promise<string> {
    const ancestorId = await findMostRecentCommonAncestor(this.uprtcl)(
      commitsIds
    );
    const ancestor = await this.uprtcl.getCommit(ancestorId);

    const originalData: T = await this.data.getData(ancestor.dataId);
    const datasPromises = commitsIds.map(id =>
      this.uprtcl.getCommit(id).then(commit => this.data.getData(commit.dataId))
    );

    const newDatas: T[] = await Promise.all(datasPromises);

    const newData = await this.mergeData(originalData, newDatas);

    const newDataId = await this.data.createData(newData);

    // TODO: filter out the parents that are already ancestors

    const mergeCommit: Commit = {
      creatorId: userService.getUsername(),
      dataId: newDataId,
      parentsIds: commitsIds,
      message: 'merge commits',
      timestamp: Date.now()
    };
    
    return this.uprtcl.createCommit(mergeCommit);
  }

  async mergeData(_originalData: T, _newDatas: T[]): Promise<T> {
    throw new Error('Method not implemented.');
  }

  async mergeLinks(
    originalLinks: string[],
    modificationsLinks: string[][]
  ): Promise<string[]> {
    const allLinks = {};

    const originalLinksDic = {};
    for (let i = 0; i < originalLinks.length; i++) {
      const link = originalLinks[i];
      originalLinksDic[link] = {
        index: i,
        link: link
      };
    }

    const newLinks = [];
    for (let i = 0; i < modificationsLinks.length; i++) {
      const newData = modificationsLinks[i];
      const links = {};
      for (let j = 0; j < newData.length; j++) {
        const link = newData[j];
        links[link] = {
          index: j,
          link: link
        };
        allLinks[link] = true;
      }
      newLinks.push(links);
    }

    const resultLinks = [];
    for (const link of Object.keys(allLinks)) {
      const linkResult = this.mergeResult(
        originalLinksDic[link],
        newLinks.map(newLink => newLink[link])
      );
      if (linkResult) {
        resultLinks.push(linkResult);
      }
    }

    return resultLinks
      .sort((link1, link2) => link1.index - link2.index).map(link => link.link);
  }

  async mergeContent(
    originalString: string,
    newStrings: string[]
  ): Promise<string> {
    const diffs = newStrings.map(newString =>
      DiffUtils.charDiff(originalString, newString)
    );

    const alignedDiffs = DiffUtils.alignDiffs(diffs);
    let mergeDiffs: Diff[] = [];
    for (let i = 0; i < alignedDiffs.original.length; i++) {
      const mergeDiff = this.mergeResult(
        alignedDiffs.original[i],
        alignedDiffs.news.map(newChar => newChar[i])
      );
      mergeDiffs.push(mergeDiff);
    }

    return DiffUtils.applyDiff(originalString, mergeDiffs);
  }

  mergeResult<A>(original: A, modifications: A[]): A {
    const changes = modifications.filter(
      modification => !lodash.isEqual(original, modification)
    );

    switch (changes.length) {
      // Object has not changed
      case 0:
        return original;
      case 1:
        return changes[0];
      default:
        if (changes.every(change => lodash.isEqual(changes[0], change))) {
          return changes[0];
        }
        throw new Error('conflict when trying to merge');
    }
  }
}
