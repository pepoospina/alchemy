import { Dictionary } from '../../types';
import { DiscoveryService } from '../discovery.service';
import { DiscoveryLocal } from '../local/discovery.local';
import { CidCompatible } from '../cid.service';

export interface DiscoveryProvider<T> {
  discovery: DiscoveryService;
  service: T;
  connected: boolean;
}

export class Multiplatform<T extends CidCompatible> {
  /**
   * Dictionary of service providers
   * Its key should be the identification of the source by other sources
   */
  serviceProviders: Dictionary<DiscoveryProvider<T>>;

  // Stores the known sources locally
  knownSources: DiscoveryService = new DiscoveryLocal();

  constructor(serviceProviders: Dictionary<DiscoveryProvider<T>>) {
    this.serviceProviders = serviceProviders;
  }

  public async getKnownSources(hash: string): Promise<string[]> {
    return this.knownSources.getKnownSources(hash);
  }

  /**
   * Discover the sources of the given link from the discover service of the originSource
   * and store them locally for future operations
   */
  private async discoverLinkSources(
    serviceProvider: string,
    link: string
  ): Promise<void> {
    const discoverService = this.serviceProviders[serviceProvider].discovery;

    let knownSources = await this.knownSources.getKnownSources(link);
    if (!knownSources || knownSources.length === 0) {
      knownSources = await discoverService.getKnownSources(link);
    }

    // If there are no known sources, assume that the source of the object is the original source
    if (knownSources) {
      await this.knownSources.addKnownSources(link, knownSources);
    }
  }

  /**
   * Discover the sources of the given links from the discover service of the originSource
   * and store them locally for future operations
   */
  protected async discoverLinksSources(
    serviceProvider: string,
    links: string[]
  ): Promise<void> {
    const discoverService = this.serviceProviders[serviceProvider].discovery;

    if (discoverService) {
      // Discover known sources of link from the discover service
      await Promise.all(
        links
          .filter(link => link != null)
          .map(link => this.discoverLinkSources(serviceProvider, link))
      );
    }
  }

  /**
   * Gets the object identified with the given hash from the given source
   */
  protected async getFromSource<O>(
    source: string,
    getter: (service: T) => Promise<O>,
    linksSelector: (object: O) => string[] = () => [],
    idSelector: (object: O) => string = o => o['id']
  ): Promise<O> {
    // Try to retrieve the object
    const object = await getter(this.serviceProviders[source].service);

    if (object) {
      const discoveryPromises = [];
      if (!(object instanceof Array)) {
        // Object retrieved successfully, discover the known sources of the links the object points to
        const links = linksSelector(object);
        await this.discoverLinksSources(source, links);
      } else {
        // If object is an array, we should add to the known sources each element of the array
        discoveryPromises.concat(
          object.map(element =>
            this.knownSources.addKnownSources(idSelector(element), [source])
          )
        );
        discoveryPromises.concat(
          object.map(element =>
            this.discoverLinksSources(source, linksSelector(element))
          )
        );
        await Promise.all(discoveryPromises);
      }
    }
    return object;
  }

  /**
   * Gets the object identified with the given hash from the given source,
   * removing it from known sources if the source does not have the object
   */
  private async tryGetFromSource<O>(
    source: string,
    hash: string,
    getter: (service: T) => Promise<O>,
    linksSelector: (object: O) => string[] = () => []
  ): Promise<O> {
    try {
      const object = await this.getFromSource(source, getter, linksSelector);

      if (!object) {
        // The get call succeeded but didn't return the object, remove the source from the known sources
        await this.knownSources.removeKnownSource(source, hash);
      }
      return object;
    } catch (e) {
      // The get call failed, don't remove the known source as it could be a network error
      console.error(e);
      return null;
    }
  }

  /**
   * Retrieves the known source for the given hash, and uses the source's service provider to get the object
   * Finally, asks for the known sources of the links contained in the object
   *
   * @param hash: the hash of the object to be discovered
   * @param getter: function that executes the call to get the object from the hash
   * @param linksSelector: function that gets the links from the retrieved object to ask for their sources
   * @returns the object retrieved
   */
  protected async discover<O>(
    hash: string,
    getter: (service: T) => Promise<O>,
    linksSelector: (object: O) => string[] = () => []
  ): Promise<O> {
    if (typeof hash !== 'string') {
      console.log('[MULTIPLATFORM] Trying to discover null object');
      return null;
    }

    // Retrieve the known sources from the local store
    const knownSources = await this.knownSources.getKnownSources(hash);
    console.log(`[MULTIPLATFORM] Known sources for ${hash}:`, knownSources);

    if (knownSources) {
      // Iterate through the known sources until a source successfully returns the object
      const promises = knownSources.map(async source => {
        const object = await this.tryGetFromSource(
          source,
          hash,
          getter,
          linksSelector
        );
        if (object) return object;
        throw new Error('object not found');
      });

      const object = await this.raceToSuccess(promises);
      if (object) return object;
    }

    const object = await this.getFirstFromAllSources(
      hash,
      getter,
      linksSelector
    );

    if (object) return object;

    // All known sources failed, throw error
    throw new Error(
      `Object with hash ${hash} not found in any of the known sources`
    );
  }

  protected async getFirstFromAllSources<O>(
    hash: string,
    getter: (service: T) => Promise<O>,
    linksSelector: (object: O) => string[] = () => []
  ): Promise<O> {
    if (typeof hash !== 'string') {
      return null;
    }

    const promises = this.getServiceProviders().map(async serviceProvider => {
      const object = await this.tryGetFromSource(
        serviceProvider,
        hash,
        getter,
        linksSelector
      );

      if (!object) throw new Error('object not retrieved from this source');

      if (!(object instanceof Array)) {
        await this.knownSources.addKnownSources(hash, [serviceProvider]);
      }
      return object;
    });

    return this.raceToSuccess(promises);
  }

  raceToSuccess<O>(promises: Array<Promise<O>>): Promise<O> {
    let numRejected = 0;

    return new Promise((resolve, reject) =>
      promises.forEach(promise =>
        promise.then(resolve).catch(() => {
          if (++numRejected === promises.length) reject();
        })
      )
    );
  }

  /**
   * Retrieves the objects from all the service providers
   *
   * @param hash: the hash of the object to be discovered
   * @param getter: function that executes the call to get the object from the hash
   * @param linksToObjects: function that gets the links from the retrieved object to ask for their sources
   * @returns the array of objects retrieved
   */
  protected async getFromAllSources<O>(
    hash: string,
    getter: (service: T) => Promise<O>,
    linksSelector: (object: O) => string[] = () => []
  ): Promise<Array<O>> {
    if (typeof hash !== 'string') {
      return null;
    }

    const promises = this.getServiceProviders().map(async serviceProvider => {
      const object = await this.tryGetFromSource(
        serviceProvider,
        hash,
        getter,
        linksSelector
      );
      if (object && !(object instanceof Array)) {
        await this.knownSources.addKnownSources(hash, [serviceProvider]);
      }
      return object;
    });

    return Promise.all(promises);
  }

  /**
   * Executes the given modify function in the given service provider,
   * and stores the known sources of the given links on that service provider's discovery module
   */
  private async modifyWithLinks<S>(
    serviceProvider: string,
    modifier: (service: T) => Promise<S>,
    linksToObjects: string[]
  ): Promise<S> {
    // Execute the given modifier function in the service provider
    const newHash = await modifier(this.getServiceProvider(serviceProvider));

    // Get the discovery service for the given service provider
    const discoveryService = this.serviceProviders[serviceProvider].discovery;
    // TODO: check if this known source should be source or serviceProvider
    // const source = await discoveryService.getOwnSource();

    if (discoveryService) {
      // Stores the links contained in the object in the discovery service of the given service provider
      await Promise.all(
        linksToObjects.map(async link => {
          const knownLinkSources = await this.knownSources.getKnownSources(
            link
          );

          await discoveryService.addKnownSources(link, knownLinkSources);
        })
      );
    }

    return newHash;
  }

  /**
   * Creates the object in the given service provider,
   * stores it in the local known sources
   * and stores the known sources of its links in the discovery service of the given service provider
   *
   * @param serviceProvider
   * @param creator
   * @param linksToObjects
   * @returns the newly created hash of the object
   */
  protected async create(
    serviceProvider: string,
    creator: (service: T) => Promise<string>,
    linksToObjects: string[]
  ): Promise<string> {
    // Create the object in the service provider
    const newHash = await this.modifyWithLinks(
      serviceProvider,
      creator,
      linksToObjects
    );

    // Add the newly created object to the local known sources
    await this.knownSources.addKnownSources(newHash, [serviceProvider]);

    return newHash;
  }

  /**
   * Executes the given update function on the given service provider
   *
   * @param serviceProvider
   * @param updater
   * @param linksToObjects
   */
  public async update(
    serviceProvider: string,
    updater: (service: T) => Promise<void>,
    linksToObjects: string[]
  ): Promise<void> {
    return this.modifyWithLinks(serviceProvider, updater, linksToObjects);
  }

  /**
   * Returns the service provider identified by the given key
   */
  public getServiceProviders(): string[] {
    return Object.keys(this.serviceProviders).filter(name => this.serviceProviders[name].connected);
  }

  /**
   * Returns the service provider identified by the given key
   */
  public getServiceProvider(serviceProvider: string): T {
    return this.serviceProviders[serviceProvider].service;
  }
}
