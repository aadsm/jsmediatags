/**
 * @flow
 */
'use strict';

const StringUtils = require('./StringUtils');

import type {
  DecodedString
} from './StringUtils';

import type {
  LoadCallbackType,
  CharsetType
} from './FlowTypes';

class MediaFileReader {
  _isInitialized: boolean;
  _size: number;

  constructor(path: any) {
    this._isInitialized = false;
    this._size = 0;
  }

  /**
   * Decides if this media file reader is able to read the given file.
   */
  static canReadFile(file: any): boolean {
    throw new Error("Must implement canReadFile function");
  }

  /**
   * This function needs to be called before any other function.
   * Loads the necessary initial information from the file.
   */
  init(callbacks: LoadCallbackType): void {
    var self = this;

    if (this._isInitialized) {
      setTimeout(callbacks.onSuccess, 1);
    } else {
      return this._init({
        onSuccess: function() {
          self._isInitialized = true;
          callbacks.onSuccess();
        },
        onError: callbacks.onError
      });
    }
  }

  _init(callbacks: LoadCallbackType): void {
    throw new Error("Must implement init function");
  }

  /**
   * @param range The start and end indexes of the range to load.
   *        Ex: [0, 7] load bytes 0 to 7 inclusive.
   */
  loadRange(range: [number, number], callbacks: LoadCallbackType): void {
    throw new Error("Must implement loadRange function");
  }

  /**
   * @return The size of the file in bytes.
   */
  getSize(): number {
    if (!this._isInitialized) {
      throw new Error("init() must be called first.");
    }

    return this._size;
  }

  getByteAt(offset: number): number {
    throw new Error("Must implement getByteAt function");
  }

  getBytesAt(offset: number, length: number): Array<number> {
    var bytes = new Array(length);
    for( var i = 0; i < length; i++ ) {
      bytes[i] = this.getByteAt(offset+i);
    }
    return bytes;
  }

  isBitSetAt(offset: number, bit: number): boolean {
    var iByte = this.getByteAt(offset);
    return (iByte & (1 << bit)) != 0;
  }

  getSByteAt(offset: number): number {
    var iByte = this.getByteAt(offset);
    if (iByte > 127) {
      return iByte - 256;
    } else {
      return iByte;
    }
  }

  getShortAt(offset: number, isBigEndian: boolean): number {
    var iShort = isBigEndian
      ? (this.getByteAt(offset) << 8) + this.getByteAt(offset + 1)
      : (this.getByteAt(offset + 1) << 8) + this.getByteAt(offset);
    if (iShort < 0) {
      iShort += 65536;
    }
    return iShort;
  }

  getSShortAt(offset: number, isBigEndian: boolean): number {
    var iUShort = this.getShortAt(offset, isBigEndian);
    if (iUShort > 32767) {
      return iUShort - 65536;
    } else {
      return iUShort;
    }
  }

  getLongAt(offset: number, isBigEndian: boolean): number {
    var iByte1 = this.getByteAt(offset),
      iByte2 = this.getByteAt(offset + 1),
      iByte3 = this.getByteAt(offset + 2),
      iByte4 = this.getByteAt(offset + 3);

    var iLong = isBigEndian
      ? (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
      : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;

    if (iLong < 0) {
      iLong += 4294967296;
    }

    return iLong;
  }

  getSLongAt(offset: number, isBigEndian: boolean): number {
    var iULong = this.getLongAt(offset, isBigEndian);

    if (iULong > 2147483647) {
      return iULong - 4294967296;
    } else {
      return iULong;
    }
  }

  getInteger24At(offset: number, isBigEndian: boolean): number {
    var iByte1 = this.getByteAt(offset),
      iByte2 = this.getByteAt(offset + 1),
      iByte3 = this.getByteAt(offset + 2);

    var iInteger = isBigEndian
      ? ((((iByte1 << 8) + iByte2) << 8) + iByte3)
      : ((((iByte3 << 8) + iByte2) << 8) + iByte1);

    if (iInteger < 0) {
      iInteger += 16777216;
    }

    return iInteger;
  }

  getStringAt(offset: number, length: number): string {
    var string = [];
    for (var i = offset, j = 0; i < offset+length; i++, j++) {
      string[j] = String.fromCharCode(this.getByteAt(i));
    }
    return string.join("");
  }

  getStringWithCharsetAt(
    offset: number,
    length: number,
    charset: ?CharsetType
  ): DecodedString {
    var bytes = this.getBytesAt(offset, length);
    var string;

    switch ((charset||'').toLowerCase()) {
      case "utf-16":
      case "utf-16le":
      case "utf-16be":
        string = StringUtils.readUTF16String(bytes, charset === "utf-16be");
        break;

      case "utf-8":
        string = StringUtils.readUTF8String(bytes);
        break;

      default:
        string = StringUtils.readNullTerminatedString(bytes);
        break;
    }

    return string;
  }

  getCharAt(offset: number): string {
    return String.fromCharCode(this.getByteAt(offset));
  }

  /**
   * The ID3v2 tag/frame size is encoded with four bytes where the most
   * significant bit (bit 7) is set to zero in every byte, making a total of 28
   * bits. The zeroed bits are ignored, so a 257 bytes long tag is represented
   * as $00 00 02 01.
   */
  getSynchsafeInteger32At(offset: number): number {
    var size1 = this.getByteAt(offset);
    var size2 = this.getByteAt(offset+1);
    var size3 = this.getByteAt(offset+2);
    var size4 = this.getByteAt(offset+3);
    // 0x7f = 0b01111111
    var size =size4 & 0x7f
      | ((size3 & 0x7f) << 7)
      | ((size2 & 0x7f) << 14)
      | ((size1 & 0x7f) << 21);

    return size;
  }
}

module.exports = MediaFileReader;
