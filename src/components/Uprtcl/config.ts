let env = 'development'
// let env = 'production'

export const holochainEnabled = false;
export const c1Enabled = true;
export const ethEnabled = true;

export const holochainServiceProvider =
  'holochain://QmTxSxPovQyWBkTRrM1gFAbtVZUAcS1oMvzkGqihbufKSs';

export const c1ServiceProvider = 
  'https://www.collectiveone.org/uprtcl/1';

export const ethServiceProvider = 
  'eth://71ABb6Dbf02a568Eafb25E638836434E507E09a8';

export const polkadotServiceProvider = 
  'polkadot://71ABb6Dbf02a568Eafb25E638836434E507E09a8';

export const defaultService = c1ServiceProvider;

export const offline = env === 'development' ? true : false;

export const c1Url = env === 'development' ?
  'http://localhost:3000/uprtcl/1' :
  'https://uprtcl-dev.herokuapp.com/1';

export const ipfsConfig = env === 'development' ?
  {
    host: '127.0.0.1',
    port: 5001,
    protocol: 'http'
  } :
  {
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
  };

export const ethLocation = env === 'development' ? 
  'ws://127.0.0.1:8545' :
  '';