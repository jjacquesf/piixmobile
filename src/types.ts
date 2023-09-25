// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/example-file-transfer
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {RequestHandler} from 'express-serve-static-core';

export type FileUploadHandler = RequestHandler;


export type UploadedFiles = {[fieldname: string]: globalThis.Express.Multer.File[];} | globalThis.Express.Multer.File[];
