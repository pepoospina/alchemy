import { UprtclMultiplatform } from './multiplatform/uprtcl.multiplatform';
import { DataMultiplatform } from './multiplatform/data.multiplatform';

import { DataHolochain } from './holochain/data.holochain';
// import { DraftHolochain } from './holochain/draft.holochain';
import { UprtclHolochain } from './holochain/uprtcl.holochain';
import { DiscoveryHolochain } from './holochain/discovery.holochain';

import { DataCollectiveOne } from './c1/data.c1';
// import { DraftCollectiveOne } from './c1/draft.c1';
import { UprtclCollectiveOne } from './c1/uprtcl.c1';
import { DiscoveryCollectiveOne } from './c1/discovery.c1';

import { UprtclEthereum } from './eth/uprtcl.eth';
// import { DiscoveryEthereum } from './eth/discovery.eth';


import { DataIpfs } from './data.ipfs';
import { DraftLocal } from './local/draft.local';
import { TextNode } from './../types';

import { store } from '../store';
import { setEthAccount } from '../actions/app';

import { 
  ipfsConfig, 
  ethLocation, 
  c1Enabled, 
  holochainEnabled, 
  ethEnabled, 
  c1ServiceProvider, 
  holochainServiceProvider, 
  ethServiceProvider } from '../config';

let uprtclConfig = {};
let dataConfig = {};

if (c1Enabled) {
  uprtclConfig[c1ServiceProvider] = {
    service: new UprtclCollectiveOne(),
    discovery: new DiscoveryCollectiveOne(),
    connected: true
  };
  dataConfig[c1ServiceProvider] = {
    discovery: new DiscoveryCollectiveOne(),
    service: new DataCollectiveOne(),
    connected: true
  };
}

if (holochainEnabled) {
  uprtclConfig[holochainServiceProvider] = {
    service: new UprtclHolochain(),
    discovery: new DiscoveryHolochain(),
    connected: false
  };
  dataConfig[holochainServiceProvider] = {
    discovery: new DiscoveryHolochain(),
    service: new DataHolochain(),
    connected: false
  };
}

if (ethEnabled) {
  let ethReady = (account: string) => {
    console.log(`[UPRTCL-INIT] callback to set eth account`, account)
    store.dispatch(setEthAccount(account));
  }

  uprtclConfig[ethServiceProvider] = {
    service: new UprtclEthereum(ethLocation, ipfsConfig, ethReady),
    discovery: new DiscoveryCollectiveOne(),
    connected: false
  };
  dataConfig[ethServiceProvider] = {
    discovery: new DiscoveryCollectiveOne(),
    service: new DataIpfs(ipfsConfig),
    connected: false
  };
}

export const uprtclMultiplatform = new UprtclMultiplatform(uprtclConfig, c1ServiceProvider);
export const dataMultiplatform = new DataMultiplatform(dataConfig, c1ServiceProvider);
export const draftService = new DraftLocal<{
  commitId: string;
  draft: TextNode;
}>();

if (ethEnabled) {
  uprtclMultiplatform.serviceProviders[ethServiceProvider].service.connect();
}