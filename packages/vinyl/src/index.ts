export {vinylfs} from './fs';
export * from './interfaces';

import {component, Logger, Provider} from '@ziqquratu/ziqquratu';
import {VinylFSServiceFactory} from './fs';
import * as chokidar from 'chokidar';

@component({
  providers: [
    Provider.ofInstance<chokidar.FSWatcher>('chokidar.FSWatcher', chokidar.watch([], {
      ignoreInitial: true,
      persistent: true
    })),
    Provider.ofFactory({
      key: 'vinyl.Logger',
      inject: ['ziqquratu.Logger'],
      create: (logger: Logger) => logger.inScope('vinyl')
    }),
  ],
  factories: [
    VinylFSServiceFactory,
  ]
})
export default class Vinyl {}
