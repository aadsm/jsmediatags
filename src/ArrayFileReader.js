/**
 * @flow
 */
'use strict';

var MediaFileReader = require('./MediaFileReader');

import type {
  Byte,
  ByteArray,
  LoadCallbackType
} from './FlowTypes';

class ArrayFileReader extends MediaFileReader {
  _array: ByteArray;
  _size: number;

  constructor(array: ByteArray) {
    super();
    this._array = array;
    this._size = array.length;
    this._isInitialized = true;
  }

  init(callbacks: LoadCallbackType) {
    setTimeout(callbacks.onSuccess, 0);
  }

  loadRange(range: [number, number], callbacks: LoadCallbackType) {
    setTimeout(callbacks.onSuccess, 0);
  }

  getByteAt(offset: number): Byte {
    return this._array[offset];
  }
}

module.exports = ArrayFileReader;
