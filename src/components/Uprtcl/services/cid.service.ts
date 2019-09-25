import { CidConfig } from './cid.config';

export interface CidCompatible {
  /** ---------------
   * Compatible CidConfigs.
   *
   * A Service Provider should inform its preferred CidConfiguration
   * so that the cache service knows how to optimistically create
   * the objects it needs
   *
   * ---------------- */
  getCidConfig(): CidConfig;
}
