var CID = require('cids');
var multihashing = require('multihashing-async');

/** hashes the cid to fit in a bytes32 word */
export const hashCid = async (perspectiveCidStr: string) => {
  const cid = new CID(perspectiveCidStr);
  const encoded = await multihashing.digest(cid.buffer, 'sha2-256');
  return '0x' + encoded.toString('hex');
}

export const hashText = async (text: string) => {
  const encoded = await multihashing.digest(Buffer.from(text), 'sha2-256');
  return '0x' + encoded.toString('hex');
}