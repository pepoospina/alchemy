import { LitElement, customElement, property, html, css } from "lit-element";
import * as blockies from './../lib/blockies.js';
import { shortId } from "../lib/helpers";

@customElement('co-blockie')
export class CoBlockie extends LitElement {
  @property({type: String})
  name: string;

  @property({type: String})
  hash: string;

  @property({type: String})
  showDetails: string = 'yes';

  firstUpdated() {
    this.shadowRoot.getElementById('BLOCKIE').appendChild(blockies.create({
      seed: this.hash,
      size: 8,
      scale: 4
    }));
  }

  render() {
    return html`
      <div class='blockie-set'>
        ${this.showDetails === 'yes' ? html`
        <div class='object-type'>${this.name}</div>` : ''}
        <div id='BLOCKIE' class='blockie'></div>
        ${this.showDetails === 'yes' ? html`
        <div class='object-id font-mono'>${shortId(this.hash)}</div>` : ''}
        
      </div>`
  }

  static get styles () {
    return [css`

      .blockie-set {
        width: 100%;
        margin: 0 auto;
        text-align: center;
      }

      .blockie canvas {
        width: 100%;
      }

      .object-type {
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        background-color: #2d3748;
        color: white;
        font-size: 14px;
      }

      .object-id {
        border-bottom-left-radius: 5px;
        border-bottom-right-radius: 5px;
        background-color: #2d3748;
        color: white;
        font-size: 12px;
      }`]
  }
}