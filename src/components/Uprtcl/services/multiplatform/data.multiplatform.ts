import { DiscoveryProvider } from './multiplatform';
import { DataService } from '../data.service';
import { CachedMultiplatform } from './cached.multiplatform';
import { DataLocal } from '../local/data.local';
import { Dictionary } from './../../types';
import { CidConfig } from '../cid.config';

export class DataMultiplatform extends CachedMultiplatform<DataService>
  implements DataService {
  
  linksFromTextNode = node => node.links;

  defaultService: string;

  constructor(
    serviceProviders: Dictionary<DiscoveryProvider<DataService>>,
    defaultService: string
  ) {
    super(serviceProviders, new DataLocal());
    this.defaultService = defaultService;
  }

  getData<T>(dataId: string): Promise<T> {
    return this.cachedDiscover(
      dataId,
      service => service.getData(dataId),
      (service, data) => service.createData({ ...data, id: dataId }),
      this.linksFromTextNode
    );
  }

  createData<T>(data: T): Promise<string> {
    return this.createDataIn(this.defaultService, data);
  }
  
  createDataIn<T>(serviceProvider: string, data: T): Promise<string> {
    (<DataLocal<T>>this.cacheService).setCidConfig(
      this.serviceProviders[serviceProvider].service.getCidConfig()
    );
    /** prevent old ids conflicts */
    delete data['id'];
    return this.optimisticCreate(
      serviceProvider,
      data,
      (service, object) => service.createData(object),
      this.linksFromTextNode(data)
    );
  }

  getCidConfig(): CidConfig {
    throw new Error('Method not implemented.');
  }
}
