let UprtclContractArtifact = require('./Uprtcl.json');
import { userService } from './../user/user.service.imp'
import { uprtclMultiplatform } from '../index';
import { ethServiceProvider } from '../../config';
var Web3 = require('web3');

export class EthereumConnection {
  localhost: string;
  web3: any;
  uprtclInstance: any;
  accounts: string[];
  networkId: number;
  isReady: boolean = false;
  readyCallback: Function;
  initializing: Promise<void>

  constructor(host: string, readyCallback: Function) {
    this.localhost = host;
    this.readyCallback = readyCallback;
  }

  connect() {
    this.initializing = new Promise(async (resolve) => {
      let provider;
      
      if (this.localhost !== '') {
        const prefix = this.localhost.substr(0, 2);
        switch (prefix) {
          case 'ws':
            provider = new Web3.providers.WebsocketProvider(this.localhost);
            break;

          case 'ht':
            provider = new Web3.providers.HttpProvider(this.localhost);
            break;
        }
      } else {
        if (window['ethereum']) {
          provider = window['ethereum'];
          try {
            await window['ethereum'].enable();
          } catch (error) {
            console.error("User denied account access")
          }
        }
        else if (window['web3']) {
          provider = window['web3'].currentProvider;
        }
      }
      
      this.web3 = new Web3(provider);
      console.log('[ETH] web3 created', this.web3 != null);

      this.accounts = await this.web3.eth.getAccounts();
      this.networkId = await this.web3.eth.net.getId();

      console.log('[ETH] accounts', this.accounts);
      console.log('[ETH] networkId', this.networkId);
      
      userService.setUsername(this.accounts[0]);
      
      this.web3.transactionConfirmationBlocks = 1;
      this.uprtclInstance = new this.web3.eth.Contract(
        UprtclContractArtifact.abi,
        UprtclContractArtifact.networks[this.networkId].address);

      this.isReady = true;
      this.readyCallback(this.accounts[0]);

      if (uprtclMultiplatform.serviceProviders[ethServiceProvider]) {
        uprtclMultiplatform.serviceProviders[ethServiceProvider].connected = true;
      }
      
      resolve();
    });
  }

  public ready(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    else return this.initializing;
  }

  /** a function to call a method and resolve only when confirmed */
  public async send(funcName: string, pars: any[], sender: string): Promise<any> {
    await this.ready();

    return new Promise(async (resolve, reject) => {
      
      // let gasEstimated = await this.uprtclInstance.methods[funcName](...pars).estimateGas()
      let sendPars = { 
        from: sender ? sender : this.accounts[0],
        gas: 4000000
      }
      console.log(`[ETH] CALLING ${funcName}`, pars, sendPars);
      
      this.uprtclInstance.methods[funcName](...pars)
      .send(sendPars)
      .once('transactionHash', (transactionHash) => {
        console.log(`[ETH] TX HASH ${funcName} `, { transactionHash, pars });
      })
      .on('receipt', (receipt) => {
        console.log(`[ETH] RECEIPT ${funcName} receipt`, { receipt, pars });
        resolve();
      })
      .on('error', (error) => {
        reject();
        console.error(`[ETH] ERROR ${funcName} `, { error, pars });
      })
      .on('confirmation', (confirmationNumber) => {
        if (confirmationNumber <= 3) console.log(`[ETH] CONFIRMED ${funcName}`, { confirmationNumber, pars });
        resolve();
      })
      .then((receipt: any) => {
        console.log(`[ETH] MINED ${funcName} call mined`, { pars, receipt });
        resolve();
      })
    });
  }

  public call(funcName: string, pars: any[]): Promise<any> {
    console.log(`[ETH] Call ${funcName}`, { pars });
    return this.uprtclInstance.methods[funcName](...pars)
      .call({ from: this.accounts[0] });
  }
}
