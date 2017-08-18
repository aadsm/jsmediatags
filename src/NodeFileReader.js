/**
 * @flow
 */
'use strict';

const fs = require('fs');

const ChunkedFileData = require('./ChunkedFileData');
const MediaFileReader = require('./MediaFileReader');

import type {
  LoadCallbackType
} from './FlowTypes';


class NodeFileReader extends MediaFileReader {
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

    fs.stat(self._path, function(err, stats) {
      if (err) {
        if (callbacks.onError) {
          callbacks.onError({"type": "fs", "info": err});
        }
      } else {
        self._size = stats.size;
        callbacks.onSuccess();
      }
    });
  }

  loadRange(range: [number, number], callbacks: LoadCallbackType) {
    var fd = -1;
    var self = this;
    var fileData = this._fileData;

    var length = range[1] - range[0] + 1;
    var onSuccess = callbacks.onSuccess;
    var onError = callbacks.onError || function(object){};

    if (fileData.hasDataRange(range[0], range[1])) {
      process.nextTick(onSuccess);
      return;
    }

    var readData = function(err, _fd) {
      if (err) {
        onError({"type": "fs", "info": err});
        return;
      }

      fd = _fd;
      // TODO: Should create a pool of Buffer objects across all instances of
      //       NodeFileReader. This is fine for now.
      var buffer = new Buffer(length);
      fs.read(_fd, buffer, 0, length, range[0], processData);
    };

    var processData = function(err, bytesRead, buffer) {
      fs.close(fd, function(err) {
        if (err) {
          console.error(err);
        }
      });

      if (err) {
        onError({"type": "fs", "info": err});
        return;
      }

      storeBuffer(buffer);
      onSuccess();
    };

    var storeBuffer = function(buffer) {
      var data = Array.prototype.slice.call(buffer, 0, length);
      fileData.addData(range[0], data);
    }

    fs.open(this._path, "r", undefined, readData);
  }
}

module.exports = NodeFileReader;
