/**
 * @flow
 */
'use strict';

const ChunkedFileData = require('./ChunkedFileData');
const MediaFileReader = require('./MediaFileReader');

import type {
    LoadCallbackType
} from './FlowTypes';

class ArrayBufferFileReader extends MediaFileReader {
    _buffer: ArrayBuffer;
    _fileData: ChunkedFileData;

    constructor(buffer: ArrayBuffer) {
        super();
        this._buffer = buffer;
        this._fileData = new ChunkedFileData();
    }

    static canReadFile(file: any): boolean {
        return typeof ArrayBuffer === 'function' && file instanceof ArrayBuffer
    }

    _init(callbacks: LoadCallbackType): void {
        this._size = this._buffer.byteLength;
        setTimeout(callbacks.onSuccess, 1);
    }

    loadRange(range: [number, number], callbacks: LoadCallbackType): void {
        var arrayBuf = this._buffer.slice(range[0], range[1] + 1);
        var viewData = new Uint8Array(arrayBuf);
        this._fileData.addData(range[0], viewData);
        callbacks.onSuccess();
    }

    getByteAt(offset: number): number {
        return this._fileData.getByteAt(offset);
    }
}

module.exports = ArrayBufferFileReader;
