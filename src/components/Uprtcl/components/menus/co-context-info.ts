import { LitElement, customElement, property, html, css } from "lit-element";
import store from './../../../../configureStore';
import { IRootState } from './../../../../reducers/index';
import { connect } from 'pwa-helpers/connect-mixin';
import { PerspectiveFull, MergeRequest } from "../../types";
import { uprtclData } from "../../services/uprtcl-data";

import './co-new-perspective';
import './../co-blockie';
import './../co-waiting-gif';

import { shortId, isOwnerOfPerspective } from "../../lib/helpers";
import { newPerspective, mergePerspective, changeOwner, mergePerspectiveRequest, loadDocument, executeMergeRequest } from "../../actions/editor";

@customElement('co-context-info')
export class CoContextInfo extends connect(store)(LitElement) {

  @property({ type: String })
  perspectiveId: string;

  @property({ type: Boolean })
  loading: boolean = true;

  @property({ type: Boolean })
  showPerspectiveCreator: boolean = false;

  @property({ type: Boolean })
  showChangeOwner: boolean = false;

  @property({ type: Boolean })
  creatingNewPerspective: boolean = false;

  @property({attribute: false})
  loggedUser: string;

  perspective: PerspectiveFull;
  contextPerspectives: PerspectiveFull[];
  mergeRequests: MergeRequest[];
  canMerge: boolean;

  close() {
    let event = new CustomEvent('close');
    this.dispatchEvent(event);
  }

  async firstUpdated() {
    console.log(`[CO-CONTEXT-INFO] updated()`);
    this.loading = true;
    
    this.perspective = await uprtclData.getPerspectiveFull(this.perspectiveId, 0);
    console.log(`[CO-CONTEXT-INFO] perspective`, this.perspective);
    
    let contextPerspectivesBase = await uprtclData.uprtcl.getContextPerspectives(this.perspective.context);

    let getOwners = contextPerspectivesBase.map( async (perspective): Promise<PerspectiveFull> => {
      let owner = await uprtclData.uprtcl.getPerspectiveOwner(perspective.id);
      let perspectiveFull: PerspectiveFull = {
        id: perspective.id,
        name: perspective.name,
        context: perspective.context,
        creatorId: perspective.creatorId,
        owner: owner,
        origin: perspective.origin,
        timestamp: perspective.timestamp,
        draft: null,
        head: null
      }
      return perspectiveFull;
    })

    this.contextPerspectives = await Promise.all(getOwners);
    console.log(`[CO-CONTEXT-INFO] contextPerspectives`, this.contextPerspectives);

    this.canMerge = isOwnerOfPerspective(this.perspective.origin, this.loggedUser, this.perspective.owner);

    this.mergeRequests = await uprtclData.uprtcl.getMergeRequestsTo(this.perspective.id);
    console.log({mergeRequests: this.mergeRequests})

    this.loading = false;
  }

  stateChanged(state: IRootState) {
    // console.log(`[CO-NODE] stateChanged()`, this.nodeId, this.block)
    this.loggedUser = state.uprtclApp.ethAccount;
  }

  providerSelected(event) {
    console.log(event);
  }

  async createNewPerspective(event) {
    this.showPerspectiveCreator = false;
    
    this.creatingNewPerspective = true;
    await store.dispatch(newPerspective(this.perspectiveId, event.detail.name, event.detail.provider));
    /** the action makes a redirect to the new perspective url */
  }

  canChangeOwner() {
    let isEthCheck = new RegExp('^eth://');
    let isEth = isEthCheck.test(this.perspective.origin);
    let canEdit = !isEth || (this.loggedUser === this.perspective.owner);
    console.log('[CO-CONTEXT-INFO] canChangeOwner', canEdit)
    return canEdit;
  }

  async changeOwner() {
    this.showChangeOwner = false;
    let input = this.shadowRoot.getElementById('NEW_OWNER') as any;
    console.log('[CO-CONTEXT-INFO] changeOwner', this.perspectiveId, input.value);
    await store.dispatch(changeOwner(this.perspectiveId, input.value));
    await store.dispatch(loadDocument());
    this.firstUpdated();
  }

  merge(perspectiveId: string) {
    this.creatingNewPerspective = true;
    store.dispatch(mergePerspective(this.perspectiveId, perspectiveId))
    /** the action makes a redirect to the new perspective url */
  }

  mergeRequest(perspectiveId: string) {
    this.creatingNewPerspective = true;
    store.dispatch(mergePerspectiveRequest(this.perspectiveId, perspectiveId))
    /** the action makes a redirect to the new perspective url */
  }

  executeMergeRequest(requestId: string, perspectiveId: string) {
    console.log('[CO-CONTEXT-INFO] executeMergeRequest', {requestId});
    store.dispatch(executeMergeRequest(requestId, perspectiveId))
  }

  isReadyToExecute(request: MergeRequest) {
    if ((request.authorized === 1) && (request.approvedAddresses.includes(this.loggedUser))) {
      return true;
    } 
    return false;
  }

  render() {
    return html`
      <!-- TODO: Remove the flash-of-unstyled-content by creating a new class that has all the tailwind styles
                and inherit from that instead of LitElement (there is an issue with the @customElement annotation that needs
                to be solved)-->
      <link rel="stylesheet" href="./images/tw.css">
      
      <div class='container'>
        ${ this.loading ? 
          html`
            <div class='loading-container'>
              <co-waiting-gif></co-waiting-gif>
            </div>` : 
          html`
            <div class='row'>
              <div class='column-2'>
                <div class='blockie-container'>
                  <co-blockie name='context' hash=${this.perspective.context}></co-blockie>
                </div>              
              </div>

              <div class='header-div text-center text-2xl'>
                <b>${this.perspective.name}</b><br>
                <div class='overflow-x-auto px-2'>
                  <span class=text-xs font-mono>${this.perspective.id}</span>
                </div>              
              </div>
                
              <div class='column-2'>
                <div class='blockie-container'>
                  <co-blockie name='perspective' hash=${this.perspective.id}></co-blockie>
                </div>
              </div>
            </div>

            <hr>
            
            <div class='row data-row'>
              <b class=''>origin: </b><span  class='font-mono text-s'>${this.perspective.origin}</span><br>
              <b class=''>owner: </b><span  class='font-mono text-s'>${this.perspective.owner}</span><br>
              <b class=''>data: </b><span  class='font-mono text-xxs'>${shortId(this.perspective.head ? this.perspective.head.data.id : 'empty')}</span>
            </div>

            ${ this.canChangeOwner() ? html`
              <div class='row'>
              <div class='text-red-700'>
                <button class='uppercase object-none' @click=${() => this.showChangeOwner = true}>Change Owner</button>
              </div>
              ${ this.showChangeOwner ? html`
                <div class='input-div'>
                  <input id='NEW_OWNER' class='border-gray-600 border-b' placeholder='owner (required)' />
                </div>
              </div>
              
              <div class='flex text-red-700 justify-end'>
                <button class='uppercase m-2 font-thin object-none ' @click=${() => this.showChangeOwner = false}>Cancel</button>
                <button class='uppercase m-2 font-thin object-none ' @click=${this.changeOwner}>Change</button>
              </div>` : ''}
            </div>` : ''}

            <hr>
            ${ this.mergeRequests.length > 0 ? html`
              <div class='row'>
                <b class='text-xl'>Merge Requests:</b>
                <div class='merge-requests'>
                  ${ this.mergeRequests.map(request => {
                    return html`
                      <div class='row other-perspective'>
                        <div class='blockie-container'>
                          <co-blockie name='perspective' hash=${request.fromPerspectiveId} showdetails='no'></co-blockie>
                        </div>
                        <div class='perspective-details'>
                          <b class=''>id: </b><span class='font-mono text-s'>${request.id}</span><br>
                          <b class=''>from: </b><span class='font-mono text-s'>${request.fromPerspectiveId}</span><br>
                          ${ this.isReadyToExecute(request) ? 
                            html`
                              <div class='text-red-700 flex row'>
                                <button class='mt-1 uppercase object-none' @click=${() => this.executeMergeRequest(request.id, request.toPerspectiveId)}>Execute</button>
                              </div>` :  ''
                          }
                        </div>
                      </div>`
                    })
                  }
                </div>
              </div>` : ''}
            
            <div class='row'>
              <b class='text-xl'>Other perspectives:</b>
              
              <div class='row mb-3 mt-3'>
                <div class='text-red-700'>
                  <button class='uppercase object-none' @click=${() => this.showPerspectiveCreator = true}>Create New</button>
                </div>
                ${ this.showPerspectiveCreator ? 
                html`
                  <div class='p-2'>
                    <co-new-perspective
                      @create=${this.createNewPerspective}
                      @cancel=${()=> this.showPerspectiveCreator = false}
                    ></co-new-perspective>
                  </div>` : ''}

                  ${ this.creatingNewPerspective ? html`
                    <div class='loading-creating'>
                      <co-waiting-gif></co-waiting-gif> 
                    </div>
                  ` : '' }

              </div>
              <div class='other-perspectives'>
                ${this.contextPerspectives.filter(p => p.id != this.perspective.id).map(otherPerspective => {
                  return html`
                    <div class='row other-perspective'>
                      <div class='blockie-container'>
                        <co-blockie name='perspective' hash=${otherPerspective.id} showdetails='no'></co-blockie>
                      </div>
                      <div class='perspective-details'>
                        <b class=''>name: </b><span class='font-mono text-s'>${otherPerspective.name}</span><br>
                        <b class=''>origin: </b><span  class='font-mono text-s'>${otherPerspective.origin}</span><br>
                        <b class=''>creator: </b><span  class='font-mono text-s'>${otherPerspective.creatorId}</span><br>
                        <b class=''>owner: </b><span  class='font-mono text-s'>${otherPerspective.owner}</span><br>
                        <div class='text-red-700 flex'>
                          <a class='uppercase object-none' href='./?pid=${otherPerspective.id}&sp=${otherPerspective.origin}'>Go |</a>
                          ${ this.canMerge ? 
                            html`
                            <button class='ml-2 uppercase object-none' @click=${() => this.merge(otherPerspective.id)}>Merge</button>` : 
                            html`
                            <button class='ml-2 uppercase object-none' @click=${() => this.mergeRequest(otherPerspective.id)}>Merge Request</button>`
                          }
                        </div>
                      </div>
                    </div>`
                })}`}
              </div>         
            </div>
          
            <hr>
            <div class='text-red-700 flex justify-end mt-4'>
              <button class='uppercase object-none' @click=${() => this.close()}>Close</button>
            </div>
          </div>`
        }

  static get styles() {
    return [
      css`
        .container {
          width: calc(90vw - 20px);
          max-width: 450px;
        }

        .loading-container {
          height: 350px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          margin-left: calc(50% - 10px);
        }

        .loading-creating {
          height: 80px;
          margin-left: calc(50% - 10px);
        }
        
        .row {
          width: 100%;
          overflow: hidden;
        }

        .header-div {
          width: calc(100% - 75px - 75px - 12px);
          float: left;
          padding: 12px 6px;
        }

        hr {
          margin: 12px 0px;
        }

        .column-2 {
          width: 75px;
          float: left;
        }

        .top-row .blockie-container {
          width: 75px;
          margin: 0 auto;
        }

        .data-row {
          overflow-x: auto;
        }

        .mid-row .blockie-container {
          width: 60px;
          margin: 0 auto;
        }

        .other-perspectives {
          max-height: calc(100vh - 500px);
          overflow: auto;
        }

        .other-perspective {
          overflow: hidden;
          margin-bottom: 12px;
        }

        .other-perspective .blockie-container {
          width: 75px;
          float: left;
        }

        .other-perspective .perspective-details {
          width: calc(100% - 75px - 16px);
          margin-left: 16px;
          float: left;
        }
     `
    ];
  }
}