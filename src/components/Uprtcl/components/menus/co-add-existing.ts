import { LitElement, customElement, property, html, css } from "lit-element";
import store from './../../../../configureStore';
import { connect } from 'pwa-helpers/connect-mixin';
import { addExisting } from "../../actions/editor";

@customElement('co-add-existing')
export class CoCommit extends connect(store)(LitElement) {

  @property({type: String})
  onPerspectiveId: string;

  @property({type: Number})
  index: number;

  firstUpdated() {
  }

  cancel() {
    let event = new CustomEvent('cancel');
    this.dispatchEvent(event);
  }

  add() {
    let input = this.shadowRoot.getElementById('PERSPECTIVE_ID') as any;
        
    console.log('[CO-ADD-EXISTING] add()', this.onPerspectiveId, input.value);
    store.dispatch(addExisting(input.value, this.onPerspectiveId, this.index));

    let event = new CustomEvent('done');
    this.dispatchEvent(event);
  }

  render() {
    return html`
        <!-- TODO: Remove the flash-of-unstyled-content by creating a new class that has all the tailwind styles
         and inherit from that instead of LitElement (there is an issue with the @customElement annotation that needs
         to be solved)-->
        <link rel="stylesheet" href="./images/tw.css">

        <div class='container'>
          <input 
            class='border-gray-200 border'
            id='PERSPECTIVE_ID' 
            placeholder='perspective id'/>
          <div class='text-red-700 flex justify-end mt-4'>
            <button class='uppercase object-none' @click=${() => this.cancel()}>Cancel</button>
            <button class='uppercase object-none ml-4' @click=${this.add}>Accept</button>
          </div>
        </div>`
  }

  static get styles() {
    return [
      css`
        .container {
          width: 230px;
        }

        textarea {
          width: calc(100% - 14px);
        }
     `
    ];
  }
}