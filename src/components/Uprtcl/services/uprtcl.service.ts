import { Commit, Perspective, MergeRequest } from '../types';
import { CidCompatible } from './cid.service';

export interface UprtclService extends CidCompatible {

  ready(): Promise<void>;
  connect(): void;
  getPerspectiveOwner(perspectiveId: string): Promise<string>
  changePerspectiveOwner(perspectiveId: string, newOwner: string);

  /** ---------------
   * Basic Getters
   * ---------------- */
  getPerspective(perspectiveId: string): Promise<Perspective>;
  getCommit(commitId: string): Promise<Commit>;

  /** ---------------
   * Support getters
   * ---------------- */
  /** getContextPerspectives() returns all the perspectives associated to a 
   * context.
   * 
   * @param contextId The context id
   */
  getContextPerspectives(contextId: string): Promise<Perspective[]>;

  /** ---------------
   * Object Creators
   *
   *  "Creators" create new objects using the authenticated user as creatorId
   *  and compute the ID of the object using the platform native hash algorithm.
   *
   * ----------------- */
  createPerspective(perspective: Perspective): Promise<string>;
  createCommit(commit: Commit): Promise<string>;

  /** ---------------
   * Support modifiers
   * ---------------- */

  /** updateHead() set the head of a perspective to a given commitId
   * - perspectiveId: ID of the perspective. Cannot be empty and must exist on the platform.
   * - commitId: ID of the commit. Cannot be empty but MAY not exist in the platform.
   */
  updateHead(perspectiveId: string, commitId: string | null): Promise<void>;

  /** craete a new merge request object */
  createMergeRequest(request: MergeRequest): Promise<String>;

  /** receives a list of head updates, group them together and return an identifier of the list */
  getMergeRequest(requestId: string): Promise<MergeRequest>;

  /** approve an existing merge request */
  authorizeMergeRequest(requestId: string): Promise<void>;

  /** approve an existing merge request */
  executeMergeRequest(requestId: string): Promise<void>;

  getMergeRequestsTo(perspectiveId: string): Promise<MergeRequest[]>;

  /** getHead() get the head of a perspective to a given commitId
   * - perspectiveId: ID of the perspective. Cannot be empty and must exist on the platform.
   */
  getHead(perspectiveId: string): Promise<string>;
}
