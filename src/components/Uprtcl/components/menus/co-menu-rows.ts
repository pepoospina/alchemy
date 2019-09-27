import { LitElement, customElement, property, html, css } from "lit-element";

export interface MenuOption {value:string, text:string, url:string, disabled:boolean};
export const MENU_SEPARATOR = '_SEPARATOR_';

@customElement('co-menu-rows')
export class CoMenuRows extends LitElement {

  @property({ type: Array })
  /** [ 0:value, 1:text, icon url, disabled flag ] */
  options: Array<MenuOption> = [
    {
      value: 'example',
      text: 'example option',
      url: '',
      disabled: false
    }
  ];

  clicked(value: string) {
    // console.log(`[CONTEXT-MENU] clicked() value: ${value}`)
    let event = new CustomEvent('selected', {
      detail: {
        value: value
      }
    });
    this.dispatchEvent(event);
  }

  firstUpdated() {
  }

  render() {
    return html`
        <!-- TODO: Remove the flash-of-unstyled-content by creating a new class that has all the tailwind styles
         and inherit from that instead of LitElement (there is an issue with the @customElement annotation that needs
         to be solved)-->
        <link rel="stylesheet" href="/assets/uprtcl/tw.css">

        <div class='container bg-white'>
          ${ this.options.map((option) => {
            return option.value === MENU_SEPARATOR ? 
            html`<div class='row separator'><hr></div>` :
            html`<div class="row hover:bg-gray-200" @click=${() => this.clicked(option.value)}>
                  <div class="row-text">${option.text}</div>
                  <div class="row-icon"><img class='' src=${option.url} /></div>
                </div>` })
          }
        </div>`
  }

  static get styles() {
    return [
      css`
        .container {
          width: 230px;
          user-select: none;
        }

        .row {
          width: 100%;
          clear: both;
          cursor: pointer;
          overflow: hidden;
          padding: 3px;
          transition: background-color 100ms linear;
        }

        .separator {
          margin: 6px 0px;
        }

        .row-icon {
          height: 20px;
          width: 20px;
          float: left;
        }

        .row-icon img {
          height: 100%;
          width: 100%;
        }

        .row-text {
          min-height: 1px;
          width: calc(100% - 20px);
          float: left;
        }
     `
    ];
  }
}