import {
  bootstrap, component, logging, LogLevel, Provider, DatabaseConfig,
} from '@ziqquratu/ziqquratu';
import {caching} from '@ziqquratu/caching';
import {yaml, directoryContent} from '@ziqquratu/nabu';
import {resource, Server, ServerConfig} from '@ziqquratu/tashmetu';
import {terminal} from '@ziqquratu/terminal';
import {validation, ValidationPipeStrategy} from '@ziqquratu/schema';
import { vinylfs } from '@ziqquratu/vinyl';

@component({
  dependencies: [
    import('@ziqquratu/nabu'),
    import('@ziqquratu/tashmetu'),
    import('@ziqquratu/schema'),
    import('@ziqquratu/vinyl'),
  ],
  providers: [
    Provider.ofInstance<DatabaseConfig>('ziqquratu.DatabaseConfig', {
      collections: {
        'schemas': directoryContent({
          driver: vinylfs(),
          path: 'schemas',
          extension: 'yaml',
          serializer: yaml(),
        }),
        'posts': {
          source: directoryContent({
            driver: vinylfs(),
            path: 'posts',
            extension: 'yaml',
            serializer: yaml({
              frontMatter: true,
              contentKey: 'articleBody',
            }),
          }),
          use: [
            logging(),
            caching(),
            validation({
              schema: 'https://example.com/BlogPosting.schema.yaml',
              strategy: ValidationPipeStrategy.ErrorInFilterOut
            }),
          ]
        }
      },
    }),
    Provider.ofInstance<ServerConfig>('tashmetu.ServerConfig', {
      middleware: {
        '/api/posts': resource({collection: 'posts'}),
      }
    }),
  ],
  inject: ['tashmetu.Server'],
})
export class Application {
  constructor(private server: Server) {}

  async run() {
    this.server.listen(8000);
  }
}

bootstrap(Application, {
  logLevel: LogLevel.Info,
  logFormat: terminal()
}).then(app => app.run());
