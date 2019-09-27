import { LitElement, html, css, property, customElement } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';
import store from './../../../configureStore';
import { IRootState } from './../../../reducers/index';
import { pullPerspective, resetRootDocument } from '../actions/editor';

import './co-node';
import { isOwnerOfPerspective } from '../lib/helpers';
import { Block } from '../types';
import { blockSelector } from '../reducers/editor';

@customElement('co-editor')
export class CoEditor extends connect(store)(LitElement) {
  
  @property({type: String})
  rootNodeId:string = '';

  @property({attribute: false})
  tasksPending:boolean = false;

  @property({attribute: false})
  block: Block;

  @property({attribute: false})
  loggedUser: string;

  // Local reference to the state, needed to select the block after an attribute update 
  state: IRootState; 
  pulled: boolean = false;

  stateChanged(state: IRootState) {
    this.tasksPending = state.uprtclApp.tasksPending;
    this.block = blockSelector(state.uprtclEditor, this.rootNodeId);
    this.loggedUser = state.uprtclApp.ethAccount;
    this.state = state;
  }

  canWrite(): string {
    if (!this.block) return 'no';
    return isOwnerOfPerspective(this.block.serviceProvider, this.block.owner, this.loggedUser) ? 'yes' : 'no';
  }
  
  async firstUpdated() {
    console.log('CO-EDITOR firstUpdated', {rootNodeId: this.rootNodeId});
    store.dispatch(resetRootDocument(this.rootNodeId));
  }

  async updated() {
    if (this.block) {
      if (this.canWrite() !== 'yes' && !this.pulled) {
        this.pulled = true;
        console.log('[CO-EDITOR] firstUpdated - pullPerspective')
        store.dispatch(pullPerspective(this.block.id))
      }
    }
  }

  protected render() {
    return html`
      <div>
        <co-node 
          nodeid=${this.rootNodeId}
          level=0>
        </co-node>
        ${this.tasksPending ? html`
          <div class='loading-tasks'>
            <co-waiting-gif></co-waiting-gif> 
          </div>` : '' }
      </div>
    `;
  }

  static get styles() {
    return [
      css`
        :host {
          display: block;
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 30vh;
        }

        .loading-tasks {
          position: fixed;
          bottom: 30px;
          right: 30px;
        }
     `
    ];
  }

}
