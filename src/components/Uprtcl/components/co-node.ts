import { LitElement, html, css, property, customElement } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';
import store from './../../../configureStore';
import { IRootState } from './../../../reducers/index';
import {} from '../actions/app';
import { Block } from '../types';
import { blockSelector } from '../reducers/editor';

import './co-node-content';
import './menus/co-menu';
import { commitGlobal, addExisting } from '../actions/editor';
import { isOwnerOfPerspective } from '../lib/helpers';

@customElement('co-node')
export class CoNode extends connect(store)(LitElement) {
  
  @property({type: String})
  nodeId:string = '';

  @property({type: String})
  parentId: string = '';

  @property({type: Number})
  indexInParent: number = 0;

  @property({type: Number})
  level: number = 0;

  @property({attribute: false})
  block: Block;

  @property({attribute: false})
  isFocused: Boolean = false;

  @property({attribute: false})
  loggedUser: string;

  // Local reference to the state, needed to select the block after an attribute update 
  state: IRootState; 

  stateChanged(state: IRootState) {
    // console.log(`[CO-NODE] stateChanged()`, this.nodeId, this.block)
    this.block = blockSelector(state.uprtclEditor, this.nodeId);
    this.loggedUser = state.uprtclApp.ethAccount;
    this.state = state;
  }

  canWrite(): string {
    return isOwnerOfPerspective(this.block.serviceProvider, this.block.owner, this.loggedUser) ? 'yes' : 'no';
  }

  firstUpdated() {
    this.addEventListener('keydown', this.onKeydown);
    this.block = blockSelector(this.state.uprtclEditor, this.nodeId);
  }

  updated() {
    // console.log(`[CO-NODE] updated()`, this.nodeId, this.block)
    this.block = blockSelector(this.state.uprtclEditor, this.nodeId);
  }

  onFocus() {
    // console.log(`[CO-NODE] onFocus()`, event)
    this.isFocused = true
  }

  onBlur() {
    // console.log(`[CO-NODE] onBlur()`, event)
    this.isFocused = false
  }

  onKeydown(event) {
    // listen to save with ctr + s
    if (this.level === 0) {
      if ((event.key === 's') && (event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        console.log(`[CO-NODE-CONTENT] auto save`, event);
        this.commit();
      }
    }
  } 

  commit() {
    store.dispatch(commitGlobal(this.nodeId, ''));
  }

  dragStart(event) {
    console.log('CO-NODE-CONTENT dragStart', this.nodeId );
    event.dataTransfer.setData('text/plain', JSON.stringify({
      perspectiveId: this.block.id
    }))
  }

  dragDropped(event) {
    console.log('CO-NODE-CONTENT dragDropped', this.nodeId );
    event.stopPropagation();
    event.preventDefault();
    let dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
    store.dispatch(addExisting(dragData.perspectiveId, this.parentId, this.indexInParent + 1));
  }

  protected render() {

    if (!this.block) {
      return html`
        <div class='loading-container'>
          <co-waiting-gif></co-waiting-gif>
        </div>`;
    }

    // Anything that's related to rendering should be done in here.
    const focusClasses = this.isFocused ? 'bg-gray-200' :  ''
    const commitedClasses = this.block.status === 'DRAFT' ? 'draft-block' : ''
    const nodeContentClasses = this.level === 0 ? 'node-content-internal-short' : 'node-content-internal-full'
    
    const nodeRowClasses = [commitedClasses, 'node-row'].join(' ')
    const containerClasses = [focusClasses].join(' ')

    return html`
      <link rel="stylesheet" href="./images/tw.css">
      <div class=${containerClasses}>
        <div class=${nodeRowClasses}>
          <div class="node-content"
            draggable='true' 
            @dragstart=${this.dragStart} class=${containerClasses}
            @drop=${this.dragDropped}>
            ${this.level === 0 ? html`
              <div class='blockie-div'>
                <co-blockie name='perspective' hash=${this.nodeId} showdetails='no'></co-blockie>
              </div>` : ''}          
              
            <div class=${nodeContentClasses}>
              <co-node-content 
                .block=${this.block} 
                parentid=${this.parentId}
                indexinparent=${this.indexInParent}
                level=${this.level} 
                canwrite=${this.canWrite()}
                @focus=${this.onFocus}
                @blur=${this.onBlur}>
              </co-node-content>
            </div>

            
          </div>
          
          <div class="node-menu">
            <co-menu
              nodeid=${this.nodeId}
              parentid=${this.parentId}
              indexinparent=${this.indexInParent}
              serviceProvider=${this.block.serviceProvider}>
            </co-menu>
          </div>
          
        </div> 
        ${
          this.block.children.map((childId, index) => {
            return html`
              <co-node
                level=${this.level + 1}
                nodeid=${childId}
                parentid=${this.block.id}
                indexinparent=${index}>
              </co-node>`
          })
        }
      </div>`;
  };

  static get styles() {
    return [
      css`
        :host {
          display: block;
        }

        .loading-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          margin-left: calc(50% - 10px);
        }

        .blockie-div {
          padding-top: 4vw; /* same as title-1 !*/
          padding-bottom: 4vw; /* same as title-1 !*/
          padding-left: 12px; /* same as co-node-content !*/
          float: left;
        }

        .node-content-internal-full {
          width: calc(100% - 12px);
          float: left;
        }

        @media screen and (min-width: 800px) {
          .blockie-div {
            width: 4vw;
           
          }

          .node-content-internal-short {
            width: calc(100% - 4vw - 12px);
            float: left;
          }
        }

        @media screen and (max-width: 799px) {
          .blockie-div {
            width: 30px;
          }

          .node-content-internal-short {
            width: calc(100% - 30px - 12px);
            float: left;
          }
        }        

        .node-row {
          display: grid;
          grid-template-rows: auto;
          grid-template-columns: auto 30px;
        }

        .node-content {
          grid-column: 1/2;
          grid-row: 1/2;
        }

        .node-menu {
          grid-column: 2/3;
          grid-row: 1/2;
          place-self: center;
        }

        .draft-block {
          border-left-style: solid;
          border-left-width: 2px;
          border-left-color: #ff7733;
        }
     `
    ];
  }
}
