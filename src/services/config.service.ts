import { /* inject, */ BindingScope, ContextTags, injectable} from '@loopback/core';
import 'dotenv/config';
import {CONFIG_SERVICE} from '../keys';
require('dotenv').config();

interface S3Config {
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  // endpoint: string,
  // bucket: string,
}

@injectable({
  scope: BindingScope.TRANSIENT,
  tags: {[ContextTags.KEY]: CONFIG_SERVICE},
})
export class ConfigService {
  private s3config: S3Config;
  private bucketName: string;
  private dataBaseConfig: object;

  constructor(/* Add @inject to inject parameters */) {

    // S3
    const {
      AWS_REGION = '',
      AWS_ACCESS_KEY = '',
      AWS_SECRET_KEY = '',
      AWS_S3_ENDPOINT = '',
      AWS_S3_BUCKET = ''
    } = process.env;

    this.s3config = {
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_KEY
    }

    this.bucketName = AWS_S3_BUCKET;

    // MySQL
    const {
      DB_CONNECTOR = 'mysql',
      DB_HOST = '',
      DB_USERNAME = '',
      DB_PASSWORD = '',
      DB_NAME = '',
      DB_PORT = 3306
    } = process.env;

    this.dataBaseConfig = {
      connector: DB_CONNECTOR,
      url: `${DB_CONNECTOR}://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`,
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    }


  }

  /*
   * Add service methods here
   */
  public readonly getS3Config = (): S3Config => this.s3config;

  public get s3BucketName(): string {
    return this.bucketName;
  }

  public get dbConfig(): object {
    return this.dataBaseConfig;
  }
}
