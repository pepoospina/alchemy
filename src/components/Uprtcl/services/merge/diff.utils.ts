import { Diff, DiffMatchPatch, DiffOp } from 'diff-match-patch-ts';

const diff = new DiffMatchPatch();

export class DiffUtils {

  static charDiff(str1: string, str2: string): Diff[] {
    const diffs = diff.diff_main(str1, str2);
    return this.toChars(diffs);
  }

  static toChars(diffs: Diff[]): Diff[] {
    let result: Diff[] = [];
    for (const diff of diffs) {
      const charDiff = diff[1].split('').map(word => <Diff>[diff[0], word]);
      result = result.concat(charDiff);
    }
    return result;
  }

  static alignDiffs(diffs: Diff[][]): { original: Diff[]; news: Diff[][] } {
    const chars = {
      original: [],
      news: diffs.map(() => [])
    };

    while (!diffs.every(diff => diff.length === 0)) {
      const removalIndex = diffs.findIndex(
        diff => diff.length > 0 && diff[0][0] === DiffOp.Delete
      );
      if (
        removalIndex !== -1 &&
        diffs.every(
          (diff, index) =>
            removalIndex === index ||
            diff[0][0] === DiffOp.Equal ||
            (diff[0][0] === DiffOp.Delete &&
              diff[0][1] === diffs[removalIndex][0][1])
        )
      ) {
        // There has been a removal
        let original = diffs[removalIndex][0];
        diffs.forEach(diff => diff.shift());
        chars.original.push(original);
        chars.news.forEach(newChars => newChars.push(original));
      } else {
        const changeIndex = diffs.findIndex(
          diff => diff.length > 0 && diff[0][0] !== DiffOp.Equal
        );
        if (changeIndex !== -1) {
          const change = diffs[changeIndex].shift();
          chars.original.push(null);
          for (let i = 0; i < diffs.length; i++) {
            if (changeIndex === i) {
              chars.news[i].push(change);
            } else {
              chars.news[i].push(null);
            }
          }
        } else {
          let original = null;
          diffs.forEach(diff => (original = diff.shift()));
          chars.original.push(original);
          chars.news.forEach(newChars => newChars.push(original));
        }
      }
    }

    return chars;
  }

  static applyDiff(str: string, diffs: Diff[]): string {
    const patches = diff.patch_make(str, diffs, undefined);
    return diff.patch_apply(patches, str)[0];
  }
}