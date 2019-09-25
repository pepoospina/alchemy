import { LitElement, html, css, customElement } from "lit-element";
import store from './../../../../configureStore';
import { connect } from 'pwa-helpers/connect-mixin';
import { c1ServiceProvider, ethServiceProvider, holochainServiceProvider, polkadotServiceProvider } from "../../config";
import { setSelectedProvider } from "../../actions/app";

@customElement('co-new-perspective')
export class CoNewPerspective extends connect(store)(LitElement) {
  
  firstUpdated () {
    this.shadowRoot.getElementById('PERSPECTIVE_NAME').focus();
  }

  create() {
    
    let name = (this.shadowRoot.getElementById('PERSPECTIVE_NAME') as any).value;
    let provider = (this.shadowRoot.getElementById('PROVIDER_SELECTOR')  as any).value;

    let ok = true;
    
    /** store provider as default */
    store.dispatch(setSelectedProvider(provider));
    
    if (name === '') ok = false;
    if (!ok) return;

    let event = new CustomEvent('create', {
      detail: {
        name: name,
        provider: provider
      }
    });

    this.dispatchEvent(event);
  }

  cancel() {
    let event = new CustomEvent('cancel');
    this.dispatchEvent(event); 
  }

  render() {
    return html`
      <link rel="stylesheet" href="./images/tw.css">
      <div class='row create-row'>
        <div class='input-div'>
          <input id='PERSPECTIVE_NAME' class='border-gray-600 border-b' placeholder='name (required)' />
      
        </div>
        <div class='select-div'>
          on
          <select id='PROVIDER_SELECTOR'>
            <option value=${c1ServiceProvider}>CollectiveOne</option>
            <option value=${ethServiceProvider}>ETH/IPFS</option>
            <option value=${holochainServiceProvider}>Holochain</option>
            <option value=${polkadotServiceProvider}>Polkadot</option>
          </select>
        </div>
      </div>
      
      <div class='flex text-red-700 justify-end'>
        <button class='uppercase m-2 font-thin object-none ' @click=${this.cancel}>Cancel</button>
        <button class='uppercase m-2 font-thin object-none ' @click=${this.create}>Create</button>
      </div>`
  }

  static get styles() {
    return [
      css`
        .create-row {
          overflow: hidden;
        }

        .create-row .input-div {
          width: calc(100% - 145px);
          float: left;
        }

        .create-row .input-div input {
          width: 100%;
        }

        .create-row .select-div {
          width: 145px;
          float: left;
        }
    `];
  }
}