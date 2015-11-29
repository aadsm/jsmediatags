/**
 * @flow
 */
'use strict';

const fs = require('fs');

const ChunkedFileData = require('./ChunkedFileData');
const MediaFileReader = require('./MediaFileReader');

const CHUNK_SIZE = 4 * 1024;

import type {
  LoadCallbackType
} from './FlowTypes';


class NodeFileReader extends MediaFileReader {
  _path: string;
  _buffer: Buffer;
  // $FlowIssue - Flow gets confused with module.exports
  _fileData: ChunkedFileData;

  constructor(path: string) {
    super();
    this._path = path;
    this._buffer = new Buffer(CHUNK_SIZE);
    // $FlowIssue - Constructor cannot be called on exports
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

  init(callbacks: LoadCallbackType) {
    var self = this;

    fs.stat(self._path, function(err, stats) {
      if (err) {
        if (callbacks.onError) {
          callbacks.onError({"type": "fs", "fs": err});
        }
      } else {
        self._size = stats.size;
        self._isInitialized = true;
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
    var onError = callbacks.onError || function(){};

    if (fileData.hasDataRange(range[0], range[1])) {
      process.nextTick(onSuccess);
      return;
    }

    var readData = function(err, _fd) {
      if (err) {
        onError({"type": "fs", "fs": err});
        return;
      }

      fd = _fd;
      self._updateBufferSizeIfNeeded(length);
      fs.read(fd, self._buffer, 0, length, range[0], processData);
    };

    var processData = function(err, bytesRead, buffer) {
      fs.close(fd, function(err) {
        if (err) {
          console.error(err);
        }
      });

      if (err) {
        onError({"type": "fs", "fs": err});
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

  _updateBufferSizeIfNeeded(length: number) {
    if (length > this._buffer.length) {
      this._buffer = new Buffer(Math.ceil(length / CHUNK_SIZE) * CHUNK_SIZE);
    }
  }
}

module.exports = NodeFileReader;
