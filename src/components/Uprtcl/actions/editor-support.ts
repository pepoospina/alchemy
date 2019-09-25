import { Block, PerspectiveFull, TextNodeFull, NodeType } from '../types';
import { addBlock } from './editor';

export const hasChanged = (draft: TextNodeFull, data: TextNodeFull): boolean => {
  if (draft != null && data == null) {
    return true;
  }

  if (draft == null) {
    return false;
  }

  if (data == null) {
    return true;
  }
  
  if (draft.text !== data.text) {
    return true;
  }

  if (data.links.length != draft.links.length) {
    return true;
  }

  for (let i = 0; i < data.links.length; i++) {
    if (data.links[i].id !== draft.links[i].id) {
      return true;
    }
  }
  
  return false;
}

export const mapPerspectiveToBlock = (perspectiveFull: PerspectiveFull): Block => {
    let data = getPerspectiveData(perspectiveFull);
    
    const block: Block = {
      id: perspectiveFull.id,
      children: [],
      status: hasChanged(perspectiveFull.draft, perspectiveFull.head ? perspectiveFull.head.data:null) ? 'DRAFT' : 'COMMITED',
      content: data ? data.text : '',
      style: data ? NodeType[data.doc_node_type] : NodeType.paragraph,
      serviceProvider: perspectiveFull.origin,
      creatorId: perspectiveFull.creatorId,
      owner: perspectiveFull.owner,
      draft: perspectiveFull.draft,
      data: perspectiveFull.head ? perspectiveFull.head.data : null
    };

    if (data) {
      data.links.map(link => {
        block.children.push(link.id);
      });
    }
  
    return block;
  };
  
  export const getPerspectiveData = (perspective: PerspectiveFull): TextNodeFull => {
    if (perspective.draft) {
      return perspective.draft;
    } else {
      if (perspective.head) {
        return perspective.head.data;
      } else {
        return null;
      }
    }
  };
  
  export const addBlockRec = (perspectiveFull: PerspectiveFull, dispatch) => {
    let block = mapPerspectiveToBlock(perspectiveFull);
    let data = getPerspectiveData(perspectiveFull);
  
    if (data) {
      data.links.map(link => {
        addBlockRec(link, dispatch);
      });
    }
  
    dispatch(addBlock(block));
  }