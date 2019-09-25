import { UprtclService } from './uprtcl.service';

export class UprtclUtils {
  uprtcl: UprtclService;

  constructor(uprtcl: UprtclService) {
    this.uprtcl = uprtcl;
  }

  public async isAncestorOf(
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
}
