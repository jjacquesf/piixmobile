import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import * as XLSX from 'xlsx';

@injectable({scope: BindingScope.TRANSIENT})
export class ExcelService {
  constructor(/* Add @inject to inject parameters */) { }

  public sheetToJSON = async (buffer: Buffer, sheet: number = 0): Promise<Record<string, any>[]> => {
    XLSX.set_fs(await import("fs"));
    const tmp = XLSX.read(buffer);

    const workSheet = tmp.Sheets[tmp.SheetNames[sheet]];

    return XLSX.utils.sheet_to_json(workSheet, {header: 'A'});
  }
}
