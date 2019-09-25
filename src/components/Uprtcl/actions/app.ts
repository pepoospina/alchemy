import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { uprtclData } from './../services/uprtcl-data';
import { IRootState } from 'reducers';

export const SET_SELECTED_PROVIDER = 'SET_SELECTED_PROVIDER';
export const SET_ETH_ACCOUNT = 'SET_ETH_ACCOUNT';
export const SET_TASKS_PENDING = 'SET_TASKS_PENDING';

export interface AppActionSetSelectedProvider extends Action<'SET_SELECTED_PROVIDER'> {selectedProvider: string};
export interface AppActionSetEthAccount extends Action<'SET_ETH_ACCOUNT'> {ethAccount: string};
export interface AppActionSetTasksPending extends Action<'SET_TASKS_PENDING'> {tasksPending: boolean};

export type AppAction = 
  AppActionSetSelectedProvider | 
  AppActionSetEthAccount | 
  AppActionSetTasksPending;

type ThunkResult = ThunkAction<void, IRootState, undefined>;

export const setSelectedProvider: ActionCreator<AppActionSetSelectedProvider> = (_selectedProvider: string) => {
  return {
    type: SET_SELECTED_PROVIDER,
    selectedProvider: _selectedProvider
  };
};

export const setEthAccount: ActionCreator<AppActionSetEthAccount> = (_ethAccount: string) => {
  console.log('[ETH] Check eth provider')
  return {
    type: SET_ETH_ACCOUNT,
    ethAccount: _ethAccount
  };
};

export const setTasksPending: ActionCreator<AppActionSetTasksPending> = (_tasksPending: boolean) => {
  return {
    type: SET_TASKS_PENDING,
    tasksPending: _tasksPending
  };
};

export const watchTasks: ActionCreator<ThunkResult>  = () => {
  return dispatch => {
    uprtclData.uprtcl.taskQueue.onTasksPending(() =>
      dispatch(setTasksPending(true))
    );
    uprtclData.uprtcl.taskQueue.onTasksFinished(() =>
    dispatch(setTasksPending(false))
    );
  };
};