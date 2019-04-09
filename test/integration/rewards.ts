
import { chai, getContractAddresses, userAddresses } from './utils'

describe('Redemptions page', () => {
    let addresses;
    let daoAddress;
    const userAddress = userAddresses[0];

    before(async () => {
      await browser.url('http://127.0.0.1:3000/');
      addresses = getContractAddresses();
      daoAddress = addresses.Avatar.toLowerCase();
    })

    it('should exist', async () => {
      await browser.url(`http://127.0.0.1:3000/dao/${daoAddress}/redemptions`);
      const title = await browser.getTitle();
      title.should.be.equal('Alchemy | DAOstack');
    })
})