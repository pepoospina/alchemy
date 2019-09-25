import { TextNode } from '../../types';
import { BaseMergeStrategy } from './base.merge.strategy';

export class SimpleMergeStrategy extends BaseMergeStrategy<TextNode> {
  async mergeData(
    originalData: TextNode,
    newDatas: TextNode[]
  ): Promise<TextNode> {
    const resultText = await this.mergeContent(
      originalData.text,
      newDatas.map(data => data.text)
    );
    const resultType = this.mergeResult(
      originalData.doc_node_type,
      newDatas.map(data => data.doc_node_type)
    );

    const mergedLinks = await this.mergeLinks(
      originalData.links,
      newDatas.map(data => data.links)
    );

    return {
      links: mergedLinks,
      text: resultText,
      doc_node_type: resultType
    };
  }
}
