import { Reducer } from 'redux';
import {
  SET_SELECTED_PROVIDER,
  SET_ETH_ACCOUNT,
  SET_TASKS_PENDING,
  AppAction
} from '../actions/app';

export interface UprtclAppState {
  selectedProvider: string;
  ethAccount: string;
  tasksPending: boolean;
}

const INITIAL_STATE: UprtclAppState = {
  selectedProvider: '',
  ethAccount: '',
  tasksPending: false
};

const appReducer: Reducer<UprtclAppState, AppAction> = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case SET_SELECTED_PROVIDER:
      return {
        ...state,
        selectedProvider: action.selectedProvider
      };
    case SET_ETH_ACCOUNT:
      return {
        ...state,
        ethAccount: action.ethAccount
      };
    case SET_TASKS_PENDING:
      return {
        ...state,
        tasksPending: action.tasksPending
      };
    default:
      return state;
  }
};

export default appReducer;