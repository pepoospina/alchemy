import { LitElement, html, css, property, customElement } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';
import store from './../../../configureStore';
import { IRootState } from './../../../reducers/index';
import { setTasksPending, watchTasks, setSelectedProvider } from '../actions/app';

import { NodeType } from './../types'
import { uprtclData, UprtclData } from './../services/uprtcl-data';

import { defaultService, c1ServiceProvider, ethServiceProvider, holochainServiceProvider, polkadotServiceProvider } from './../config'

import './co-editor';
import './co-waiting-gif';

@customElement('co-workspace')
export class CoWorkspace extends connect(store)(LitElement) {
  @property({type: String})
  rootPerspectiveId:string = '';

  @property({type: String})
  documentPerspectiveId:string = '';

  @property({attribute: false})
  tasksPending:boolean = false;

  @property({attribute: false})
  creatingDocument:boolean = false;

  @property({type: String, attribute: false})
  serviceProvider:string;

  newDocumentId = '';
   
  private uprtclData: UprtclData = uprtclData;

  async initDocument () {
    console.log('[WORKSPACE] creating a document' )
    /** init an empty document as subcontext of the root perspective */
    const documentId = await this.uprtclData.initContext(
      this.serviceProvider, '', NodeType.title);

      /** init an empty document as subcontext of the root perspective */
    await this.uprtclData.initContextUnder (
      this.serviceProvider, documentId, -1, '', NodeType.paragraph);

    return documentId;
  }

  stateChanged(state: IRootState) {
    this.tasksPending = state.uprtclApp.tasksPending;
    this.serviceProvider = state.uprtclApp.selectedProvider;

    // console.log('[WORKSPACE] stateChanged', state.app);

    let serviceSelector = (this.shadowRoot.getElementById('PROVIDER_SELECTOR') as any)
    if (serviceSelector) serviceSelector.value = this.serviceProvider;

    if(!this.tasksPending && this.creatingDocument) {
      console.log('[WORKSPACE] document created on service')
      window.location.href = `./?pid=${this.newDocumentId}&sp=${this.serviceProvider}`
    }
  }

  providerSelected(event) {
    store.dispatch(setSelectedProvider(event.target.value));
  }

  async createDoc() {
    store.dispatch(setTasksPending(true));
    
    this.creatingDocument = true;
    
    this.newDocumentId = await this.initDocument();
    console.log('[WORKSPACE] document created (on cache)')
  }

  protected async firstUpdated() {
    store.dispatch(setSelectedProvider(defaultService));
    store.dispatch(watchTasks());

    let pid = new URLSearchParams(window.location.search).get("pid")
    let sp = new URLSearchParams(window.location.search).get("sp")

    console.log('[WORKSPACE] firstUpdated pid', pid)
    console.log('[WORKSPACE] firstUpdated sp', sp)
    
    if (pid && sp) {
      console.log(`[WORKSPACE] PID found. Rendering document ${pid}`)
      this.documentPerspectiveId = pid;
    }
  }

  protected render() {
    if (this.documentPerspectiveId === '') {
      return html`
        <link rel="stylesheet" href="/assets/uprtcl/tw.css">
        <div class='welcome'>
          <a href='https://github.com/uprtcl/spec' target='_blank' class='logo'>
            <img src='/assets/uprtcl/sticker2.png'/>
          </a>
          <div class='form'>
            ${!this.creatingDocument ? 
              html`
                <div class='mt-10'>
                  <span class=''>
                    On
                  </span>
                  <select
                    id='PROVIDER_SELECTOR'
                    @change=${this.providerSelected}>
                    <option value=${c1ServiceProvider}>CollectiveOne</option>
                    <option value=${ethServiceProvider}>ETH/IPFS</option>
                    <option value=${holochainServiceProvider}>Holochain</option>
                    <option value=${polkadotServiceProvider}>Polkadot</option>
                  </select><br><br>
                  <button
                    class='text-red-700 uppercase object-none' @click=${this.createDoc}>
                    Create Document
                  </button>
                </div>` : 
              html`
                <div class='loading-container'>
                  <co-waiting-gif></co-waiting-gif>
                </div>
                `
            }
          </div>
        </div>
      `;
    } else {
      return html`
        <div class='co-editor-container'>
          <co-editor rootnodeid=${this.documentPerspectiveId}></co-editor>
        </div>
      `;
    }
  }

  static get styles() {
    return [
      css`
        :host {
          display: block;
        }

        .welcome {
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100vh;
          margin-top: -20px;
        }

        .logo {
          text-align: center;
        }

        .welcome img {
          width: 200px;
          margin: 0 auto;
        }

        .form {
          height: 150px;
          margin: 0 auto;
          text-align: center;
        }

        .loading-container {
          margin: 0 auto;
          text-align: center;
          margin-top: 20px;
        }
     `
    ];
  }

}
