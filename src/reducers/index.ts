import { routerReducer } from "react-router-redux";
import { combineReducers } from "redux";
import arcReducer, { IArcState } from "./arcReducer";
import { INotificationsState, notificationsReducer } from "./notifications";
import profilesReducer, { IProfilesState } from "./profilesReducer";
import uiReducer, { IUIState } from "./uiReducer";
import web3Reducer, { IWeb3State } from "./web3Reducer";

import appReducer, { UprtclAppState } from "components/Uprtcl/reducers/app";
import editorReducer, { UprtclEditorState } from "components/Uprtcl/reducers/editor";

export interface IRootState {
  arc: IArcState;
  notifications: INotificationsState;
  profiles: IProfilesState;
  router: any;
  ui: IUIState;
  web3: IWeb3State;
  uprtclApp: UprtclAppState;
  uprtclEditor: UprtclEditorState;
}

const reducers = {
  arc: arcReducer,
  notifications: notificationsReducer,
  profiles: profilesReducer,
  router: routerReducer,
  ui: uiReducer,
  web3: web3Reducer,
  uprtclApp: appReducer,
  uprtclEditor: editorReducer 
};


export default combineReducers(reducers);
