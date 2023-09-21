// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/example-file-transfer
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {BindingKey} from '@loopback/core';
import {ConfigService} from './services/config.service';
import {S3Service} from './services/s3.service';
import {FileUploadHandler} from './types';

export const CONFIG_SERVICE = BindingKey.create<ConfigService>(
  'services.Config',
);

export const S3_SERVICE = BindingKey.create<S3Service>(
  'services.S3',
);

/**
 * Binding key for the file upload service
 */
export const FILE_UPLOAD_SERVICE = BindingKey.create<FileUploadHandler>(
  'services.FileUpload',
);

/**
 * Binding key for the storage directory
 */
export const STORAGE_DIRECTORY = BindingKey.create<string>('storage.directory');
