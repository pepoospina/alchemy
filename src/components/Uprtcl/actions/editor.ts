import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { Block, NodeType, EthHeadUpdate, HeadUpdate, MergeRequest } from '../types';

import { uprtclData } from './../services/uprtcl-data';
import { blockSelector, parentSelector, UprtclEditorState } from './../reducers/editor';

import { mapPerspectiveToBlock, addBlockRec } from './editor-support';
import { hashCid } from '../services/eth/eth.support';
import { UprtclAppState } from '../reducers/app';
import { IRootState } from 'reducers';

export const SET_ROOT_ID = 'SET_ROOT_ID';
export const ADD_BLOCK = 'ADD_BLOCK';
export const UPDATE_BLOCK = 'UPDATE_BLOCK';
export const SET_NEW_PERSPECTIVE = 'SET_NEW_PERSPECTIVE';

export interface EditorActionSetRootId extends Action<'SET_ROOT_ID'> {rootId: string};
export interface EditorActionAddBlock extends Action<'ADD_BLOCK'> {block: Block};
export interface EditorActionUpdateBlock extends Action<'UPDATE_BLOCK'> {block: Block};
export interface EditorActionSetNewPerspective extends Action<'SET_NEW_PERSPECTIVE'> {newPerspectiveId: string, provider: string};

export type EditorAction = 
  EditorActionSetRootId |
  EditorActionAddBlock | 
  EditorActionUpdateBlock |
  EditorActionSetNewPerspective;

type ThunkResult = ThunkAction<void, IRootState, undefined>;

export const setRootId: ActionCreator<EditorActionSetRootId> = (rootId: string) => {
  return {
    type: SET_ROOT_ID,
    rootId: rootId
  };
}

export const addBlock: ActionCreator<EditorActionAddBlock> = (block: Block) => {
  return {
    type: ADD_BLOCK,
    block: block
  };
}

export const setNewPerspective: ActionCreator<EditorActionSetNewPerspective> = (newPerspectiveId: string, provider: string) => {
  return {
    type: SET_NEW_PERSPECTIVE,
    newPerspectiveId: newPerspectiveId,
    provider: provider
  };
}

export const navigateToNewPerspective: ActionCreator<ThunkResult> = () => {
  return async (_dispatch, getState) => {
    let state: UprtclEditorState = getState().uprtclEditor;
    // console.log('state.newPerspective', state.newPerspective);
    window.location.href = `./?pid=${state.newPerspective[0]}&sp=${state.newPerspective[1]}`;
  };
};

export const addNewlyPerspective: ActionCreator<ThunkResult> = (parentId: string, index: string) => {
  return async (dispatch, getState) => {
    let state: UprtclEditorState = getState().uprtclEditor;
    dispatch(addExisting(state.newPerspective[0], parentId, index));    
  };
};

/**
 * This method removes a block (perspective indeed) from tree. It removes
 * all its children automatically, se beware!
 */
export const removeBlock: ActionCreator<ThunkResult> = (parentId: string, index: number) => {
  return async dispatch => {
    await uprtclData.removePerspective(parentId, index);
    dispatch(loadDocument());
  };
};


export const updateBlock: ActionCreator<ThunkResult> = (blockId: string) => async (dispatch) => {
  let node = await uprtclData.getPerspectiveFull(
    blockId,
    1
  );

  let block = mapPerspectiveToBlock(node);

  dispatch(addBlock(block))
}

export const resetRootDocument: ActionCreator<ThunkResult> = (rootDocumentId: string) => (dispatch) => {
  dispatch(setRootId(rootDocumentId));
  dispatch(loadDocument());
};

export const loadDocument: ActionCreator<ThunkResult> = () => async (dispatch, getState) => {
  let document = await uprtclData.getPerspectiveFull(
    getState().uprtclEditor.rootId,
    -1
  );

  addBlockRec(document, dispatch);  
}

export const setContent: ActionCreator<ThunkResult> = (blockId: string, content: string) => async (dispatch) => {
  await uprtclData.setDraftText(blockId, content);
  dispatch(updateBlock(blockId));
};

export const enter: ActionCreator<ThunkResult> = (
  blockId: string,
  _content: string,
  parentId: string,
  index: number,
  last: boolean = false // used for new block under title
) => async (dispatch, getState) => {
  const initNode = blockSelector(getState().uprtclEditor, blockId);

  switch (initNode.style) {
    case 'title':
      /** An enter on a title will create an empty subcontext *
       *  as the first subcontext of the title context.       */
      await uprtclData.initContextUnder(
        initNode.serviceProvider,
        initNode.id,
        last ? -1 : 0,
        _content,
        NodeType.paragraph
      );
      break;

    case 'paragraph':
      /** An enter on a paragraph will create an empty context *
       *  as the next-sibling of that paragraph.               */
      const parent: Block = blockSelector(getState().uprtclEditor, parentId);
      if (!parent)
        throw new Error(
          `Parent perspective ${parentId} not found in the tree`
        );

      await uprtclData.initContextUnder(
        parent.serviceProvider,
        parent.id,
        index + 1,
        '',
        NodeType.paragraph
      );
      break;

    default:
      throw new Error(`'Unexpected style value ${initNode.style}`);
  }

  dispatch(loadDocument());
};

export const addExisting: ActionCreator<ThunkResult> = (
  perspectiveId: string,
  parentId: string,
  index: number
) => async (dispatch) => {
  await uprtclData.insertPerspective(
    parentId,
    perspectiveId,
    index
  );

  dispatch(loadDocument());
};

export const setStyle: ActionCreator<ThunkResult> = (
  blockId: string,
  newStyle: NodeType,
  parentId: string,
  index: number
) => async (dispatch, getState) => {
  let state: UprtclEditorState = getState().uprtclEditor;

  const block: Block = blockSelector(state, blockId);
  const parent: Block = blockSelector(state,parentId);
  
  /** set the new style */
  let oldStyle = block.style;
  block.style = newStyle;
  await uprtclData.setDraftType(blockId, newStyle);

  switch (oldStyle) {
    case NodeType.title:
      switch (newStyle) {
        /** title to title: setting the same view changes nothing */
        case NodeType.title:
          return;

        /** title to paragraph: changing the type of a title to a paragraph
         *  will move all its subcontexts as youngr siblings of the new typed
         *  paragraph */

        case NodeType.paragraph:
          /** removing in sequence (parallel wont work due to index finding) */
          for (let childIx = 0; childIx < block.children.length; childIx++) {
            /** remove n times the first element */
            await uprtclData.removePerspective(blockId, 0);
          }

          /** adding in sequence */
          for (let childIx = 0; childIx < block.children.length; childIx++) {
            let childId = block.children[childIx];
            await uprtclData.insertPerspective(
              parentId,
              childId,
              index + childIx + 1
            );
          }
          break;
      }
      break;

    case NodeType.paragraph:
      switch (newStyle) {
        /** paragraph to paragraph: setting the same view changes nothing */
        case NodeType.paragraph:
          return;

        /** paragraph to title: Changing the type of a paragraph to a title
         * will move all the younger sibling contexts of the paragraph as
         * subcontexts of the new title. */
        case NodeType.title:
          if (!parent) break;
          
          let youngerSyblings = parent.children.splice(index + 1);

          /** just move the syblings up to the first one which is a title */
          let indexOfTitleSybling = youngerSyblings.findIndex(syblingId => {
            let sybling: Block = blockSelector(state, syblingId);
            return sybling.style === NodeType.title;
          });
          /** there is a title younger sybling */
          if (indexOfTitleSybling !== -1) {
            youngerSyblings = youngerSyblings.slice(0, indexOfTitleSybling);
          }

          /** removing in sequence (parallel wont work due to index finding) */
          for (let sybIx = 0; sybIx < youngerSyblings.length; sybIx++) {
            /** remove n times the next block */
            await uprtclData.removePerspective(parent.id, index + 1);
          }

          /** adding in sequence */
          for (let sybIx = 0; sybIx < youngerSyblings.length; sybIx++) {
            let sybId = youngerSyblings[sybIx];
            await uprtclData.insertPerspective(blockId, sybId, -1);
          }
          break;
      }
      break;
  }

  /** force update */
  dispatch(loadDocument());
};

/**
 * If the block is of type title, and its parent is not the rootId (meaning
 * the block is at level two or below), it makes the block (together with its children)
 * a younger sybling of the title parent
 */
export const indentLeft: ActionCreator<ThunkResult> = (
  blockId: string,
  parentId: string,
  index: number
) => async (dispatch, getState) => {

  let state: UprtclEditorState = getState().uprtclEditor;

  const rootId = state.rootId;

  if (parentId === rootId || blockId === rootId) return;

  /** level 2 or more */
  const block: Block = blockSelector(state, blockId);

  if (block.style !== NodeType.title) return;

  let grandParentId = parentSelector(state, parentId);
  let grandParent = blockSelector(state, grandParentId);

  let parentIx = grandParent.children.findIndex(
    id => id === parentId
  );

  if (!grandParentId) return;
  if (parentIx == -1) return;

  /** remove this block from parent */
  await uprtclData.removePerspective(parentId, index);

  /** add it to the grandparent */
  await uprtclData.insertPerspective(grandParentId, blockId, parentIx + 1);

  dispatch(loadDocument());
};

/** Commits the draft of the block specified by blockId and recursively
f all its children. Send the rootId to commit the entire document.
 */
export const commitGlobal: ActionCreator<ThunkResult> = (blockId: string, message: string = '') => {
  return async (dispatch) => {
    
    /** create the data in the perspective provider by default */
    let perspective = await uprtclData.uprtcl.getPerspective(blockId);
    let provider = perspective.origin;

    await uprtclData.commit(
      provider,
      blockId,
      message,
      new Date().getTime(),
      true
    );

    dispatch(loadDocument());
  };
};

export const newPerspective: ActionCreator<ThunkResult> = (
  perspectiveId: string,
  name: string,
  serviceProvider: string,
) => {
  return async (dispatch) => {
    let newPerspectiveId = await uprtclData.createGlobalPerspective(
      serviceProvider,
      perspectiveId,
      name
    );

    dispatch(setNewPerspective(newPerspectiveId, serviceProvider));
  };
};

export const mergePerspective: ActionCreator<ThunkResult> = (
  toPerspectiveId: string,
  fromPerspectiveId: string
) => {
  return async (dispatch) => {
    let headUpdates = await uprtclData.merge(toPerspectiveId, [fromPerspectiveId]);
    await uprtclData.uprtcl.taskQueue.waitForAllTasks();

    /** run merge by updating all heads */
    let updateHeads = headUpdates.map((headUpdate) => {
      return uprtclData.uprtcl.updateHead(headUpdate.perspectiveId, headUpdate.headId);
    })

    await Promise.all(updateHeads);

    dispatch(loadDocument());
  };
};

export const mergePerspectiveRequest: ActionCreator<ThunkResult> = (
  toPerspectiveId: string,
  fromPerspectiveId: string
) => {
  return async (_dispatch, getState) => {
    let state: UprtclAppState = getState().uprtclApp;
    
    let headUpdates = await uprtclData.merge(toPerspectiveId, [fromPerspectiveId]);
    await uprtclData.uprtcl.taskQueue.waitForAllTasks();

    /** create merge request */
    let createHeadUpdates = headUpdates.map(async (headUpdate: HeadUpdate):Promise<EthHeadUpdate> => {
      return {
        perspectiveIdHash: await hashCid(headUpdate.perspectiveId),
        headId: headUpdate.headId,
        executed: 0
      }
    })

    let ehtUpdateHeads = await Promise.all(createHeadUpdates);

    /** derive origin and owner from first perspective :/ */
    let toPerspective = await uprtclData.uprtcl.getPerspective(toPerspectiveId);
    let owner = await uprtclData.uprtcl.getPerspectiveOwner(toPerspectiveId);

    let request: MergeRequest = {
      toPerspectiveId: toPerspectiveId,
      fromPerspectiveId: fromPerspectiveId,
      owner: owner,
      approvedAddresses: [state.ethAccount],
      headUpdates: ehtUpdateHeads,
      nonce: 0
    }

    await uprtclData.uprtcl.createMergeRequestIn(request, toPerspective.origin);
  };
};

export const executeMergeRequest: ActionCreator<ThunkResult> = (requestId: string, perspectiveId: string) => {
  return async () => {
    await uprtclData.uprtcl.executeMergeRequestIn(requestId, perspectiveId);
  };
};

export const pullPerspective: ActionCreator<ThunkResult> = (blockId: string) => {
  return async (dispatch) => {
    await uprtclData.pull(blockId);
    dispatch(loadDocument());
  };
};

export const changeOwner: ActionCreator<ThunkResult> = (perspectiveId: string, newOwner: string) => {
  return async (dispatch) => {
    await uprtclData.changePerspectiveOwnerGlobal(perspectiveId, newOwner);
    dispatch(loadDocument());
  };
};