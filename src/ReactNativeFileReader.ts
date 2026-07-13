const RNFS = require('react-native-fs');
const { Buffer } = require('buffer');

import ChunkedFileData from './ChunkedFileData';
import MediaFileReader from './MediaFileReader';

import type {
  LoadCallbackType
} from './types';


class ReactNativeFileReader extends MediaFileReader {
  _path: string;
  _fileData: ChunkedFileData;

  constructor(path: string) {
    super();
    this._path = path;
    this._fileData = new ChunkedFileData();
  }

  static canReadFile(file: any): boolean {
    return (
      typeof file === 'string' &&
      !/^[a-z]+:\/\//i.test(file)
    );
  }

  getByteAt(offset: number): number {
    return this._fileData.getByteAt(offset);
  }

  _init(callbacks: LoadCallbackType) {
    var self = this;

    RNFS.stat(self._path)
      .then((statResult: any) => {
        self._size = statResult.size;
        callbacks.onSuccess();
      })
      .catch((error: any) => {
        callbacks.onError!({"type": "fs", "info": error});
      })
  }

  loadRange(range: [number, number], callbacks: LoadCallbackType) {
    var fd = -1;
    var self = this;
    var fileData = this._fileData;

    var length = range[1] - range[0] + 1;
    var onSuccess = callbacks.onSuccess;
    var onError = callbacks.onError || function(object: any){};

    RNFS.read(this._path, length, range[0], {encoding: 'base64'})
      .then((readData: any) => {
        const buffer = new Buffer(readData, 'base64');
        const data = Array.prototype.slice.call(buffer, 0, length);
        fileData.addData(range[0], data);
        onSuccess();
      })
      .catch((err: any) => {
        onError({"type": "fs", "info": err});
      });
  }
}

export default ReactNativeFileReader;
