import { UpdatingElement, property, customElement } from 'lit-element';

@customElement('co-content-editable')
export class CoContentEditable extends UpdatingElement {
  
  @property({ type: String })
  content: string;

  @property({ type: String})
  editable: string;

  constructor() {
    super();
    this.setAttribute('style', 'outline: 0px');
    this.setAttribute('contentEditable', 'true');
  }

  onKeydown() {
    // console.log(`[CO-CONTENT-EDITABLE] onKeydown()`, event, event.key, this.innerHTML)
  }

  firstUpdated() {
  }

  updated() {
    if (this.editable === 'yes') this.setAttribute('contentEditable', 'true');
    else this.setAttribute('contentEditable', 'false');
    this.innerHTML = this.content;
  }

}