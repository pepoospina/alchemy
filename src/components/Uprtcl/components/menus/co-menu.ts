import { LitElement, html, css, property, customElement } from 'lit-element';
import store from './../../../../configureStore';
import { connect } from 'pwa-helpers/connect-mixin';
import Popper from 'popper.js';

import { MenuOption, MENU_SEPARATOR } from './co-menu-rows';
import { setStyle, pullPerspective, removeBlock, newPerspective, navigateToNewPerspective, addNewlyPerspective } from '../../actions/editor';
import { NodeType } from '../../types';

import './co-menu-rows';
import './co-commit';
import './co-add-existing';
import './co-context-info';
import { uprtclData } from '../../services/uprtcl-data';

enum MenuOptions {
  close = 'close',
  title = 'title',
  paragraph = 'paragraph',
  commit = 'commit',
  pull = 'pull',
  info = 'info',
  go = 'go',
  newPerspectiveHere = 'newPerspectiveHere',
  newPerspectiveOut = 'newPerspectiveOut',
  remove = 'remove',
  addBefore = 'addBefore',
  addAfter = 'addAfter'
}

@customElement('co-menu')
export class CoMenu extends connect(store)(LitElement) {
  
  @property({type: String})
  nodeId: string;

  @property({type: String})
  parentId: string = '';

  @property({type: Number})
  indexInParent: number = 0;

  @property({type: String})
  serviceProvider: string;

  @property({type: Boolean, attribute: false})
  showMenu: boolean = false;

  @property({type: Boolean, attribute: false})
  showCommitDialog: boolean = false;  

  @property({type: Boolean, attribute: false})
  showContextInfo: boolean = false;  

  @property({type: Boolean, attribute: false})
  showAddExistingDialog: boolean = false;  

  @property({type: Boolean, attribute: false})
  showNewPerspectiveDialog: boolean = false;  
  
  @property({type: Number, attribute: false})
  addExistingOnIndex: number;

  // store the user selection for new perspective
  here: boolean = false;

  firstUpdated() {
    if (this.nodeId === 'zb2wwtpQ3FkPuxFdXzCjJ4pVHuGi7t2EePYt56oToh8k9HuSX') {
      setTimeout(() => {
        this.contextInfoSelected();
      }, 100);
    }
  }
  
  async onButtonClick() {
    // console.log(`[CO-MENU] onButtonClick()`);
    
    this.showMenu = !this.showMenu;
    if (!this.showMenu) return

    await this.updateComplete
    
    const menu = this.shadowRoot.getElementById('menuContainer');
    const button = this.shadowRoot.getElementById('menuButton');
    
    if ((menu == null) || (button == null)) return;

    new Popper(button, menu, {
      placement: 'left'
    });
  }

  async commitSelected() {
    this.showCommitDialog = true;
    await this.updateComplete

    const menu = this.shadowRoot.getElementById('commitContainer');
    const button = this.shadowRoot.getElementById('menuButton');

    if ((menu == null) || (button == null)) return;

    new Popper(button, menu, {
      placement: 'left',
    });
  }

  async contextInfoSelected() {
    this.showContextInfo = true;
    await this.updateComplete

    const menu = this.shadowRoot.getElementById('contextInfoContainer');
    const button = this.shadowRoot.getElementById('menuButton');

    if ((menu == null) || (button == null)) return;

    new Popper(button, menu, {
      placement: 'left',
    });
  }

  async newPerspectiveSelected(here: boolean) {
    this.showNewPerspectiveDialog = true;
    this.here = here;

    await this.updateComplete

    const menu = this.shadowRoot.getElementById('newPerspectiveContainer');
    const button = this.shadowRoot.getElementById('menuButton');

    if ((menu == null) || (button == null)) return;

    console.log('[CO-MENU] newPerspectiveSelected() creating popper', menu, button);
    new Popper(button, menu, {
      placement: 'left',
    });
  } 

  async newPerspective(event) {
    await store.dispatch(
      newPerspective(
        this.nodeId, 
        event.detail.name, 
        event.detail.provider))

    uprtclData.uprtcl.taskQueue.onTasksFinished(async () => {
      if (!this.here) {
        store.dispatch(navigateToNewPerspective())
      } else {
        await store.dispatch(removeBlock(this.parentId, this.indexInParent));
        store.dispatch(addNewlyPerspective(this.parentId, this.indexInParent))
      }
    });

    this.showNewPerspectiveDialog = false;
  }

  pullSelected() {
    store.dispatch(pullPerspective(this.nodeId));
  }

  async addExistingPerspective(onIndex: number) {
    this.addExistingOnIndex = onIndex;
    this.showAddExistingDialog = true;

    await this.updateComplete

    const menu = this.shadowRoot.getElementById('addExistingContainer');
    const button = this.shadowRoot.getElementById('menuButton');

    if ((menu == null) || (button == null)) return;

    new Popper(button, menu, {
      placement: 'left',
    });
  }

  remove() {
    store.dispatch(removeBlock(this.parentId, this.indexInParent));
  }

  menuOptions(): Array<MenuOption> {
    let options: Array<MenuOption> = [];

    options.push({ value: MenuOptions.info, text: 'Context info', url: './images/app/info.svg', disabled: false });
    options.push({ value: MenuOptions.commit, text: 'Commit changes', url: './images/app/net.svg', disabled: false });
    options.push({ value: MenuOptions.pull, text: 'Pull changes', url: './images/app/pull.svg', disabled: false });
    if (this.parentId) options.push({ value: MenuOptions.newPerspectiveHere, text: 'New perspective (here)', url: './images/app/lowercase.svg', disabled: false });
    options.push({ value: MenuOptions.newPerspectiveOut, text: `New perspective ${this.parentId ? '(outside)' : ''}`, url: './images/app/lowercase.svg', disabled: false });
    options.push({ value: MENU_SEPARATOR, text: '', url: '', disabled: false });
    options.push({ value: MenuOptions.title, text: 'Title', url: './images/app/uppercase.svg', disabled: false });
    options.push({ value: MenuOptions.paragraph, text: 'Paragraph', url: './images/app/lowercase.svg', disabled: false });
    if (this.parentId) options.push({ value: MENU_SEPARATOR, text: '', url: '', disabled: false });
    if (this.parentId) options.push({ value: MenuOptions.go, text: 'Go', url: './images/app/go.svg', disabled: false });
    if (this.parentId) options.push({ value: MenuOptions.remove, text: 'Remove', url: './images/app/lowercase.svg', disabled: false });
    if (this.parentId) options.push({ value: MenuOptions.addBefore, text: 'Add before', url: './images/app/lowercase.svg', disabled: false });
    if (this.parentId) options.push({ value: MenuOptions.addAfter, text: 'Add after', url: './images/app/lowercase.svg', disabled: false });
    options.push({ value: MENU_SEPARATOR, text: '', url: '', disabled: false });
    options.push({ value: MenuOptions.close, text: 'Close', url: './images/app/close.svg', disabled: false });

    return options;
  }

  optionSelected(event) {
    // console.log(`[CO-MENU] optionSelected()`, event);
    this.showMenu = false;

    let selected: MenuOptions = event.detail.value;

    switch(selected) {
      case MenuOptions.close: 
        this.showMenu = false;
        break;
      
      case MenuOptions.title:
        store.dispatch(setStyle(this.nodeId, NodeType.title, this.parentId, this.indexInParent));
        break;
      
      case MenuOptions.paragraph:
        store.dispatch(setStyle(this.nodeId, NodeType.paragraph, this.parentId, this.indexInParent));
        break;

      case MenuOptions.go:
        window.location.href = `./?pid=${this.nodeId}&sp=${this.serviceProvider}`;
        break;

      case MenuOptions.newPerspectiveOut:
        this.newPerspectiveSelected(false);
        break;

      case MenuOptions.newPerspectiveHere:
        this.newPerspectiveSelected(true);
        break;

      case MenuOptions.addBefore:
        this.addExistingPerspective(this.indexInParent);
        break;

      case MenuOptions.addAfter:
          this.addExistingPerspective(this.indexInParent + 1);
        break;

      case MenuOptions.remove:
        this.remove();
        break;

      case MenuOptions.commit:
        this.commitSelected();
        break;

      case MenuOptions.info:
        this.contextInfoSelected();
        break;

      case MenuOptions.pull:
        this.pullSelected();
        break;
    }
  }

  protected render() {
    return html`
      <link rel="stylesheet" href="./images/tw.css">

      <div id="menuButton" class=''>
        <img 
          @click=${this.onButtonClick} 
          class='button' 
          src='./images/app/menu_gray.svg'/>
      </div>

      ${ this.showMenu ? html`
        <div id="menuContainer" 
          class='menu-container bg-white border-2 shadow-md p-2 rounded-lg'>
          <co-menu-rows 
            .options=${this.menuOptions()}
            @selected=${this.optionSelected}
            ></co-menu-rows>
        </div>
      ` : '' }

      ${ this.showCommitDialog ? html`
        <div id="commitContainer" 
          class='dialog-container bg-white border-2 shadow-md p-2 rounded-lg'>
          <co-commit 
            perspectiveId=${this.nodeId}
            @cancel=${() => this.showCommitDialog = false}
            @done=${() => this.showCommitDialog = false}>
          </co-commit>
        </div>
      ` : '' }

      ${ this.showNewPerspectiveDialog ? html`
        <div id="newPerspectiveContainer" 
          class='dialog-container bg-white border-2 shadow-md p-2 rounded-lg'>
          <co-new-perspective 
            @cancel=${() => this.showNewPerspectiveDialog = false}
            @create=${this.newPerspective}>
          </co-new-perspective>
        </div>
      ` : '' }

      ${ this.showAddExistingDialog ? html`
        <div id="addExistingContainer" 
          class='dialog-container bg-white border-2 shadow-md p-2 rounded-lg'>
          <co-add-existing 
            onperspectiveId=${this.parentId}
            index=${this.addExistingOnIndex}
            @cancel=${() => this.showAddExistingDialog = false}
            @done=${() => this.showAddExistingDialog = false}>
          </co-add-existing>
        </div>
      ` : '' }

      ${ this.showContextInfo ? html`
        <div id="contextInfoContainer" 
          class='dialog-container bg-white border-2 shadow-md p-2 rounded-lg'>
          <co-context-info 
            perspectiveId=${this.nodeId}
            @close=${() => this.showContextInfo = false}>
          </co-context-info>
        </div>
      ` : '' }
      
    `
  };

  static get styles() {
    return [
      css`
        #menuButton {
          width: 100%;
          cursor: pointer;
          user-select: none;
        }

        #menuButton img {
          height: 15px;
        }

        .dialog-container {
          z-index: 10;
        }

        .menu-container {
          z-index: 10;
        }

        #newPerspectiveContainer {
          width: 80vw;
          max-width: 400px;
        }
     `
    ];
  }
}
