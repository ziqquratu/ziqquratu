import {inject, provider} from '@ziggurat/tiamat';
import {Transformer} from '@ziggurat/mushdamma';
import {Collection, CollectionFactory, RemoteCollectionConfig, QueryOptions} from '../interfaces';
import {EventEmitter} from 'eventemitter3';
import * as io from 'socket.io-client';

@provider({
  key: 'isimud.RemoteCollectionFactory'
})
export class RemoteCollectionFactory implements CollectionFactory<RemoteCollectionConfig> {
  private socket: any;

  public constructor(
    @inject('mushdamma.Transformer') private transformer: Transformer
  ) {
    if (typeof window !== 'undefined' && window.document) {
      this.socket = io.connect(window.location.origin);
    }
  }

  public createCollection(name: string, config: RemoteCollectionConfig): Collection {
    return new RemoteCollection(config.path, name, this.transformer, this.socket);
  }
}

class RemoteCollection extends EventEmitter implements Collection {
  private countCache: {[selector: string]: number} = {};

  public constructor(
    private _path: string,
    public readonly name: string,
    private transformer: Transformer,
    socket: any
  ) {
    super();

    if (socket) {
      socket.on('document-upserted', (doc: any) => {
        if (doc._collection === this.name) {
          this.emit('document-upserted', doc);
        }
      });
      socket.on('document-removed', (doc: any) => {
        if (doc._collection === this.name) {
          this.emit('document-removed', doc);
        }
      });
    }
  }

  public async find<T>(selector?: object, options?: QueryOptions): Promise<T[]> {
    let resp = await fetch(this.createQuery(selector, options));
    if (!resp.ok) {
      throw new Error('Failed to contact server');
    }
    this.updateTotalCount(selector || {}, resp);
    let result = [];
    for (let obj of await resp.json()) {
      result.push(await this.transformer.toInstance<T>(obj, 'relay'));
    }
    return result;
  }

  public async findOne<T>(selector: object): Promise<T> {
    let docs = await this.find<T>(selector, {limit: 1});
    if (docs.length === 0) {
      throw new Error('Document not found');
    }
    return docs[0];
  }

  public async upsert<T>(doc: T): Promise<T> {
    let resp = await fetch(this._path, {
      body: JSON.stringify(await this.transformer.toPlain(doc, 'relay')),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    });
    if (resp.ok) {
      return doc;
    } else {
      throw new Error('Failed to upsert');
    }
  }

  public async count(selector?: object): Promise<number> {
    let totalCount = this.countCache[JSON.stringify(selector)];
    if (!totalCount) {
      let resp = await fetch(this.createQuery(selector), {method: 'HEAD'});
      totalCount = this.updateTotalCount(selector || {}, resp);
    }
    return totalCount;
  }

  public remove<T>(selector?: object): Promise<T[]> {
    return Promise.reject(new Error('remove() not implemented for remote collection'));
  }

  private updateTotalCount(selector: object, resp: Response): number {
    let totalCount = resp.headers.get('x-total-count');
    if (!totalCount) {
      throw new Error('Failed to get "x-total-count" header');
    }
    return this.countCache[JSON.stringify(selector)] = parseInt(totalCount, 10);
  }

  private createQuery(selector?: Object, options?: QueryOptions): string {
    let query = this._path;
    let params: {[name: string]: string} = {};
    if (selector && Object.keys(selector).length > 0) {
      params['selector'] = JSON.stringify(selector);
    }
    if (options && Object.keys(options).length > 0) {
      params['options'] = JSON.stringify(options);
    }
    if (Object.keys(params).length > 0) {
      const esc = encodeURIComponent;
      query = query + '?' + Object.keys(params)
          .map(k => esc(k) + '=' + esc(params[k]))
          .join('&');
    }
    return query;
  }
}
