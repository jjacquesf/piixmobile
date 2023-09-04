import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'db',
  connector: 'mysql',
  url: 'mysql://Fu7EMCpc:m3J4Cup6zkauMNdG@piixmobile-db.ca5d7inrbx8v.us-east-1.rds.amazonaws.com/piixmobile-dev',
  host: 'piixmobile-db.ca5d7inrbx8v.us-east-1.rds.amazonaws.com',
  port: 3306,
  user: 'Fu7EMCpc',
  password: 'm3J4Cup6zkauMNdG',
  database: 'piixmobile-dev'
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class DbDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'db';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.db', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
