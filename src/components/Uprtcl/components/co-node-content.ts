import { LitElement, html, css, property, customElement } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store } from '../store';
import { Block, NodeType } from '../types';
import { setContent, enter, indentLeft, removeBlock } from '../actions/editor';

import './co-content-editable';

@customElement('co-node-content')
export class CoNodeContent extends connect(store)(LitElement) {
  
  @property({type: Object})
  block: Block;

  @property({type: String})
  parentId: string = '';

  @property({type: Number})
  indexInParent: number = 0;

  @property({type: String})
  canWrite: string = 'no';

  @property({type: Number})
  level: number = 0;

  @property({type: Boolean, reflect: true})
  isFocused: Boolean = false;

  /** used to decide if the watermark/placeholder is shown */
  @property({type: String})
  tempContent: string = '';
  
  @property({attribute: false})
  loggedUser: string;

  emptyOnce: boolean = false;

  firstUpdated() {
    // console.log(`[CO-NODE-CONTENT] firstUpdated()`, this.block)
    this.tempContent = this.block.content;
    this.addEventListener('click', this.focusContent)
  }

  checkUpdateContent(_newContent) {
    // console.log('[CO-NODE-CONTENT] updateBlockContent()', this.block, _newContent);
    if (this.block) {
      if (_newContent !== this.block.content) {
        this.updateContent(_newContent);
      }
    }
  }

  updateContent (_newContent: string) {
    // console.log('[CO-NODE-CONTENT] updateContent()', this.block, _newContent);
    store.dispatch(setContent(this.block.id, _newContent))
  }

  onInput (event) {
    // console.log(`[CO-NODE-CONTENT] onInput()`, event, event.path[0].innerHTML)
    this.tempContent = event.path[0].innerHTML;
  }

  onKeydown(event) {
    // console.log(`[CO-NODE-CONTENT] onKeydown()`, event, event.key)
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      console.log(`[CO-NODE-CONTENT] onKeyup() Enter`, event)
      store.dispatch(enter(
        this.block.id,
        '',
        this.parentId,
        this.indexInParent));    
    }

    if (event.key === 'Backspace') {
      event.stopPropagation();

      /** https://stackoverflow.com/a/54333903/1943661 */
      var sel = document.getSelection();
      sel['modify']("extend", "backward", "paragraphboundary");
      var pos = sel.toString().length;
      sel.collapseToEnd();

      if (event['path'][0].innerText === '') {
        if (!this.emptyOnce) {
          this.emptyOnce = true;
        } else {
          store.dispatch(removeBlock(this.parentId, this.indexInParent));
        }
        /** TODO: First node */
      } else {
        if (pos === 0) {
          if (this.level !== 0) {
            console.log('Indent Left')
            store.dispatch(indentLeft(this.block.id, this.parentId, this.indexInParent));
          }
        }
      }
    } else {
      this.emptyOnce = false;
    }
  }

  onFocus() {
    // console.log(`[CO-NODE-CONTENT] onFocus()`, event)
    this.isFocused = true
  }

  onBlur(event) {
    // console.log(`[CO-NODE-CONTENT] onBlur()`, event)
    this.checkUpdateContent(event.path[0].innerHTML)
  }

  onWatermarkClicked() {
    // console.log(`[CO-NODE-CONTENT] onWatermarkClicked()`, event)
    this.focusContent();
  }

  focusContent() {
    this.shadowRoot.getElementById('CONTENT_EDITABLE').focus();
  }

  getContent() {
    return this.block.content;
  }

  protected render() {
    const contentClasses = this.block.style === 'title' ? `title-${this.level + 1}` : 'paragraph'
    const containerClasses = ['node-content', contentClasses].join(' ');
    let watermarkClasses = this.block.style === 'title' ? `water-mark-title` : 'water-mark-paragraph';
    watermarkClasses = [watermarkClasses, 'text-gray-400'].join(' ');

    return html`
      <link rel="stylesheet" href="./images/tw.css">
      <div class=${containerClasses}>
        <co-content-editable 
          id='CONTENT_EDITABLE'
          content=${this.getContent()}
          editable=${this.canWrite}
          @keydown=${this.onKeydown}
          @focus=${this.onFocus}
          @blur=${this.onBlur}
          @input=${this.onInput}>
        </co-content-editable>
        ${ this.tempContent === '' ? 
          html`
            <div class=${watermarkClasses}
              @click=${this.onWatermarkClicked}>
              ${this.block.style === NodeType.title ? 'Title' : 'empty'}
            </div>` : 
          html``}
        
      </div> 
    `
  };

  static get styles() {
    return [
      css`
        :host {
          display: block;
        }

        .node-content {
          padding-left: 12px !important;
          min-height: 20px;
          position: relative;
        }

        .water-mark-title {
          position: absolute;
          left: 12px;
          top: 4vw;
        }

        .water-mark-paragraph {
          position: absolute;
          left: 12px;
          top: 4px;
        }

        .paragraph {
          padding: 6px 0px 4px 0px;
        }

        .paragraph a {
          font-weight: bolder;
          text-decoration: underline;
          color: #4299E1;
        }

        @media screen and (min-width: 800px) {
          .title-1 {
            font-size: 3vw;
            font-weight: bolder;
            padding: 4vw 0px 4vw 0px;
          }
        }

        @media screen and (max-width: 799px) {
          .title-1 {
            font-size: 1.4rem;
            font-weight: bolder;
            padding: 4vw 0px 4vw 0px;
          }
        }
       
        .title-2 {
          font-size: 1.2rem;
          font-weight: bold;
          padding: 12px 0px 12px 0px;
        }

        .title-3 {
          font-size: 1rem;
          font-weight: bold;
          text-decoration: underline;
          padding: 8px 0px 8px 0px;
        }

        .title-4 {
          font-size: 1rem;
          font-weight: bold;
          font-style: italic;          
          padding: 8px 0px 6px 0px;
        }

        .title-5, 
        .title-6, 
        .title-7, 
        .title-7, 
        .title-8, 
        .title-9, 
        .title-10 {
          font-size: 1rem;
          text-decoration: underline;
          padding: 8px 0px 6px 0px;
        }

     `
    ];
  }
}
