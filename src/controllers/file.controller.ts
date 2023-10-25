// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/example-file-transfer
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import fs from 'fs';
import os from 'os';

import {authenticate} from '@loopback/authentication';
import {inject, service, uuid} from '@loopback/core';
import {Filter, repository} from '@loopback/repository';

import {
  HttpErrors,
  Request,
  Response,
  RestBindings,
  del,
  get,
  oas,
  param,
  post,
  requestBody
} from '@loopback/rest';
import Ajv, {JSONSchemaType} from 'ajv';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {EntityType, Media} from '../models';
import {MediaRepository, ProductRepository} from '../repositories';
import {S3Service} from '../services';
import {FileUploadHandler, UploadedFiles} from '../types';


export interface IMediaUploadEntity {
  entityType: EntityType;
  entityId: number;
}

const schemaFileUploadEntity: JSONSchemaType<IMediaUploadEntity> = {
  type: "object",
  properties: {
    entityType: {
      type: "string",
      enum: [
        EntityType.Product
      ]
    },
    entityId: {
      type: "integer"
    }
  },
  required: ['entityType', 'entityId'],
  additionalProperties: false
}


export class FileController {
  constructor(
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @repository(ProductRepository) public productRepository: ProductRepository,
    @repository(MediaRepository) public mediaRepository: MediaRepository,
    @service(S3Service) private s3: S3Service,
  ) { }

  private getEntityModel(entity: IMediaUploadEntity) {
    switch (entity.entityType) {
      case EntityType.Product:
        return this.productRepository.findById(entity.entityId);
        break;
    }

    throw new Error('Invalid owner entity');
  }

  private getMediaFilter = (path: string): Filter<Media> => {
    const [entityType, entityId] = path.split('/');
    const filter: Filter<Media> = {
      where: {
        entityId: entityId,
        entityType: entityType,
        path: path
      }
    };

    return filter;
  }

  @authenticate('jwt')
  @post('/files', {
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
        description: 'Files and fields',
      },
    },
  })
  async fileUpload(
    @requestBody.file()
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<object> {
    return new Promise<object>((resolve, reject) => {

      this.handler(request, response, async (err: unknown) => {
        if (err) reject(err);
        else {
          const ajv = new Ajv();
          const isValid = ajv.compile(schemaFileUploadEntity);
          const entity = {
            ...request.body,
            entityId: parseInt(request.body?.entityId)
          } as IMediaUploadEntity;

          if (!isValid(entity)) {return response.status(400).send('Invalid owner entity');}

          try {
            await this.getEntityModel(entity);

            const uploadedFiles: UploadedFiles = request.files || [];
            const path = `${entity.entityType}/${entity.entityId}`;

            const paths: string[] = [];
            if (Array.isArray(uploadedFiles)) {
              for (let i = 0; i < uploadedFiles.length; i++) {

                const file = uploadedFiles[i];
                const ext = (file.originalname.split('.').pop() || '').toLowerCase();
                const id = uuid();
                const key = `${path}/${id}.${ext}`;

                const buffer = {
                  key,
                  buffer: file.buffer
                }

                await this.s3.upload(buffer);

                const media = new Media({
                  path: key,
                  mediaType: file.mimetype,
                  entityId: entity.entityId,
                  entityType: entity.entityType,
                });

                await this.mediaRepository.create(media);

                paths.push(key);
              }
            }


            resolve(paths);

          } catch (err) {
            // return response.status(400).send(err.message);
            reject(err);
          }
        }
      });
    });
  }

  @get('/files')
  @oas.response.file()
  async getFileUrl(
    @param.query.string('filename') fileName: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {

    return new Promise<object>(async (resolve, reject) => {
      const file = await this.mediaRepository.findOne(this.getMediaFilter(fileName));
      if (file == null) {
        return response.status(404).send('File not found');
      }

      const tmp_path = `${os.tmpdir}/${file.path.split('/').pop()}`;
      const ws = fs.createWriteStream(tmp_path);
      ws.on('finish', () => {
        response.download(tmp_path);
      })
      ws.on('error', (error) => {
        throw new HttpErrors[500](error.message);
      });

      const rs = await this.s3.getObject(file.path);
      rs
        .on('end', () => {
          ws.end();
        })
        .on('data', (chunk) => {
          ws.write(chunk);
        })
        .on('error', (error) => {
          throw new HttpErrors[404](error.message);
        })

    })
  }

  @authenticate('jwt')
  @del('/files')
  @oas.response.file()
  async deleteFile(
    @param.query.string('filename') fileName: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {

    const file = await this.mediaRepository.findOne(this.getMediaFilter(fileName))
    if (file != null) {
      await this.mediaRepository.deleteById(file.id);
      await this.s3.deleteObject(fileName);
      return response.send();
    }

    return response.status(404).send('File not found');
  }
}
