import { Reducer } from 'redux';
import { Dictionary, Block } from '../types'

import {
  EditorAction,
  SET_ROOT_ID,
  ADD_BLOCK,
  SET_NEW_PERSPECTIVE
} from '../actions/editor';

export interface UprtclEditorState {
  rootId: string;
  blocks: Dictionary<Block>;
  newPerspective: [string, string];
}

const INITIAL_STATE: UprtclEditorState = {
  rootId: '',
  blocks: {},
  newPerspective: ['', '']
};

const editorReducer: Reducer<UprtclEditorState, EditorAction> = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case SET_ROOT_ID:
      return {
        ...state,
        rootId: action.rootId
      };
    case ADD_BLOCK:
      state.blocks = Object.assign({}, state.blocks);
      state.blocks[action.block.id] = action.block;
      return {
        ...state
      };
    case SET_NEW_PERSPECTIVE:
      return {
        ...state,
        newPerspective: [action.newPerspectiveId, action.provider]
      };

    default:
      return state;
  }
};

export const blockSelector = (state: UprtclEditorState, blockId: string) => {
  return state.blocks[blockId];
}

export const parentSelector = (state: UprtclEditorState, blockId: string) => {
  return Object.keys(state.blocks).find(key =>
    state.blocks[key].children.includes(blockId)
  );
}

export default editorReducer;