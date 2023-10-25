import {
  BindingScope,
  ContextTags,
  injectable,
  service
} from '@loopback/core';
import AWS from 'aws-sdk';
import stream from 'stream';
import {S3_SERVICE} from '../keys';
import {ConfigService} from './config.service';
const {Duplex} = stream

interface IFile {
  key: string;
  buffer: any;
}

/**
 * A provider to return an `Express` request handler from `multer` middleware
 */
@injectable({
  scope: BindingScope.TRANSIENT,
  tags: {[ContextTags.KEY]: S3_SERVICE},
})
export class S3Service {
  private client: AWS.S3;
  constructor(@service(ConfigService) private config: ConfigService) {
    this.client = new AWS.S3({
      ...config.getS3Config()
    })
  }

  value(): S3Service {
    return new S3Service(this.config);
  }

  private bufferToStream = (buffer: any): stream.Duplex => {
    const duplexStream = new Duplex()
    duplexStream.push(buffer)
    duplexStream.push(null)
    return duplexStream
  }

  public upload = async (file: IFile) => {
    const params = {
      Bucket: this.config.s3BucketName,
      Key: file.key,
      Body: this.bufferToStream(file.buffer)
    }

    await this.client.upload(params).promise();
  }

  public signedUrl = async (path: string) => {
    const file = path.split('/').pop();
    var params = {
      Bucket: this.config.s3BucketName,
      Key: path,
      ResponseContentDisposition: 'filename=' + file
    };

    return await this.client.getSignedUrl('getObject', params);
  }

  public getObject = async (path: string) => {
    const file = path.split('/').pop();
    var params = {
      Bucket: this.config.s3BucketName,
      Key: path,
      ResponseContentDisposition: 'filename=' + file
    };

    return this.client.getObject(params).createReadStream();
  }

  public deleteObject = (path: string) => {
    var params = {
      Bucket: this.config.s3BucketName,
      Key: path,
    };

    return this.client.deleteObject(params)
  }
}
