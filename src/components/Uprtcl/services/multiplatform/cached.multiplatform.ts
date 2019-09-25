import { Multiplatform, DiscoveryProvider } from './multiplatform';
import { Dictionary } from '../../types';
import { TaskQueue } from './task.queue';
import { CidCompatible } from '../cid.service';
import { offline } from '../../config';

export class CachedMultiplatform<T extends CidCompatible> extends Multiplatform<
  T
> {
  cacheService: T;

  taskQueue = new TaskQueue();

  constructor(
    serviceProviders: Dictionary<DiscoveryProvider<T>>,
    cacheService: T
  ) {
    super(serviceProviders);
    this.cacheService = cacheService;
  }

  /**
   * Try to get the object from the cache, otherwise discover the object and store in cache
   * @param getter
   * @param discover
   * @param cloner
   */
  protected async cached<O>(
    getter: (service: T) => Promise<O>,
    discover: () => Promise<O>,
    cloner: (service: T, object: O) => Promise<any>
  ): Promise<O> {
    // If we have the object already cached, return it
    const cachedObject = await getter(this.cacheService);
    if (cachedObject) {
      return cachedObject;
    }

    // If not on cache, discover it
    const object = await discover();

    if (object) {
      // And store it in cache
      await cloner(this.cacheService, object);
    }

    return object;
  }

  /**
   * Discover object from cache or from the known sources, discovering its links sources
   */
  protected async cachedDiscover<O>(
    hash: string,
    getter: (service: T) => Promise<O>,
    cloner: (service: T, object: O) => Promise<any>,
    linksSelector: (object: O) => string[]
  ): Promise<O> {
    if (typeof hash !== 'string' || hash == null) {
      return null;
    }

    const object = await this.cached(
      getter,
      async () => {
        const object = await this.discover(hash, getter, linksSelector);
        if (object) object['id'] = hash;
        return object;
      },
      cloner
    );
    return object;
  }

  /**
   * Try to get the object from the server and cache the result,
   * else return the object from cache
   */
  protected async fallback<O>(
    sourceGetter: () => Promise<O>,
    cloner: (service: T, object: O) => Promise<any>,
    cacheGetter: (service: T) => Promise<O>
  ) {
    if (navigator.onLine || offline) {
      // Try to get object from source
      const object = await sourceGetter();

      // Clone the object into the cache
      await cloner(this.cacheService, object);

      // And return it
      return object;
    } else {
      // Otherwise, return object from cache
      return cacheGetter(this.cacheService);
    }
  }

  /**
   * Creates the object in cache synchronously and
   * schedules its creation in the service provider
   */
  protected async optimisticCreate<O>(
    serviceProvider: string,
    object: O,
    creator: (service: T, object: O) => Promise<any>,
    linksToObjects: string[]
  ): Promise<string> {
    const objectId = await creator(this.cacheService, object);

    object['id'] = objectId;

    const task = async () => {
      // First, optimistically add the service provider to the known sources
      // to create the links correctly
      await this.knownSources.addKnownSources(objectId, [serviceProvider]);

      try {
        // Execute the creator
        await this.create(
          serviceProvider,
          service => creator(service, object),
          linksToObjects
        );
      } catch (e) {
        // If failed, remove the source from the known sources
        console.error('[CACHE] creator call failed', e);
        await this.knownSources.removeKnownSource(objectId, serviceProvider);
      }
    };

    this.taskQueue.queueTask({ id: objectId, task });

    return objectId;
  }

  /**
   * Executes the update in cache synchronously and
   * schedules the same update in the service provider
   */
  protected async optimisticUpdate(
    serviceProvider: string,
    updater: (service: T) => Promise<void>,
    linksToObjects: string[],
    taskId: string = null,
    dependsOn: string = null
  ): Promise<void> {
    await updater(this.cacheService);

    const task = () => this.update(serviceProvider, updater, linksToObjects);

    this.taskQueue.queueTask({ task, id: taskId, dependsOn: dependsOn });
  }
}
