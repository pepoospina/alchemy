import { LitElement, customElement, property, html, css } from "lit-element";
import { store } from './../../store';
import { connect } from 'pwa-helpers/connect-mixin';
import { commitGlobal } from "../../actions/editor";

@customElement('co-commit')
export class CoCommit extends connect(store)(LitElement) {

  @property({type: String})
  perspectiveId: string;

  firstUpdated() {
    let input = this.shadowRoot.getElementById('INPUT_MESSAGE');
    input.focus();
  }

  cancel() {
    let event = new CustomEvent('cancel');
    this.dispatchEvent(event);
  }

  commit() {
    let input = this.shadowRoot.getElementById('INPUT_MESSAGE') as any;
    
    console.log('[CO-COMMIT] commit()', this.perspectiveId, input.value);
    store.dispatch(commitGlobal(this.perspectiveId, input.value));

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
          <textarea 
            class='border-gray-200 border'
            id='INPUT_MESSAGE' 
            rows=1 
            placeholder='message (optional)'></textarea>
          <div class='text-red-700 flex justify-end mt-4'>
            <button class='uppercase object-none' @click=${() => this.cancel()}>Cancel</button>
            <button class='uppercase object-none ml-4' @click=${this.commit}>Accept</button>
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