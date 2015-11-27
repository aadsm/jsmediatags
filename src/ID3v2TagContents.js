/**
 * This is only used for testing, but could be used for other purposes as
 * writing.
 *
 * http://id3.org/id3v2-00
 * http://id3.org/id3v2.3.0
 * http://id3.org/id3v2.4.0-structure
 *
 * TODO: Padding and Footer
 * @flow
 */
'use strict';

const ByteArrayUtils = require('./ByteArrayUtils');
const bin = ByteArrayUtils.bin;
const getSynchsafeInteger32 = ByteArrayUtils.getSynchsafeInteger32;
const getInteger32 = ByteArrayUtils.getInteger32;
const getInteger24 = ByteArrayUtils.getInteger24;

// Offsets
const FLAGS = 5;
const SIZE = 6;
const EXTENDED_HEADER = 10;
const EXTENDED_FLAGS_V3 = 14;
const EXTENDED_FLAGS_V4 = 15;
const START_EXTENDED_DATA_V3 = 20;
const START_EXTENDED_DATA_V4 = 16;
// Sizes
const HEADER_SIZE = 10;

import type {
  ByteArray,
  TagHeaderFlags,
  TagFrameFlags
} from './FlowTypes';

class ID3v2TagContents {
  _size: number;
  _major: number;
  _revision: number;
  _contents: ByteArray;
  _frames: {[key: string]: ByteArray};
  _extendedHeader: {
    UPDATE: number,
    CRC: number,
    RESTRICTIONS: number
  };
  _hasExtendedHeader: boolean;
  _nextFrameOffset: number;

  constructor(major: number, revision: number) {
    if (major < 2 || major > 4) {
      throw new Error('Major version not supported');
    }

    this._major = major;
    this._revision = revision;
    this._contents = [].concat(
      bin("ID3"),
      [major, revision],
      [0], // flags
      [0, 0, 0, 0] // size
    );
    this._frames = {};
    this._updateSize();
    this._extendedHeader = {
      // key: length
      'UPDATE': 0,
      'CRC': 0,
      'RESTRICTIONS': 0
    };
  }

  toArray(): ByteArray {
    return this._contents.slice(0);
  }

  setFlags(flags: TagHeaderFlags): ID3v2TagContents {
    var binaryFlags = 0;

    if (flags.unsynchronisation) {
      binaryFlags |= 1<<7;
    }
    if (flags.extended_header) {
      binaryFlags |= 1<<6;
    }
    if (flags.experimental_indicator) {
      binaryFlags |= 1<<5;
    }
    if (flags.footer_present) {
      binaryFlags |= 1<<4;
    }

    this._contents[FLAGS] = binaryFlags;
    return this;
  }

  setCrc(crc: ByteArray): ID3v2TagContents {
    if (!this._hasExtendedHeader) {
      this._initExtendedHeader();
    }

    if (this._major === 3) {
      this._setBitAtOffset(EXTENDED_FLAGS_V3, 7);
      this._setData(START_EXTENDED_DATA_V3, crc);
      this._extendedHeader['CRC'] = crc.length;
      // Update extended header size.
      this._setData(EXTENDED_HEADER, getInteger32(10));
    } else if (this._major === 4) {
      this._setBitAtOffset(EXTENDED_FLAGS_V4, 5);
      this._addExtendedHeaderData('CRC', crc);
    }

    this._updateSize();
    return this;
  }

  setTagIsUpdate(): ID3v2TagContents {
    if (!this._hasExtendedHeader) {
      this._initExtendedHeader();
    }

    if (this._major === 4) {
      this._setBitAtOffset(EXTENDED_FLAGS_V4, 6);
      this._addExtendedHeaderData('UPDATE', []);
    }

    return this;
  }

  /**
   * For some applications it might be desired to restrict a tag in more
   * ways than imposed by the ID3v2 specification. Note that the
   * presence of these restrictions does not affect how the tag is
   * decoded, merely how it was restricted before encoding. If this flag
   * is set the tag is restricted as follows:
   *
   *    Flag data length       $01
   *    Restrictions           %ppqrrstt
   *
   * p - Tag size restrictions

   *   00   No more than 128 frames and 1 MB total tag size.
   *   01   No more than 64 frames and 128 KB total tag size.
   *   10   No more than 32 frames and 40 KB total tag size.
   *   11   No more than 32 frames and 4 KB total tag size.
   *
   * q - Text encoding restrictions
   *
   *   0    No restrictions
   *   1    Strings are only encoded with ISO-8859-1 [ISO-8859-1] or
   *        UTF-8 [UTF-8].
   *
   * r - Text fields size restrictions
   *
   *   00   No restrictions
   *   01   No string is longer than 1024 characters.
   *   10   No string is longer than 128 characters.
   *   11   No string is longer than 30 characters.
   *
   *   Note that nothing is said about how many bytes is used to
   *   represent those characters, since it is encoding dependent. If a
   *   text frame consists of more than one string, the sum of the
   *   strungs is restricted as stated.
   *
   * s - Image encoding restrictions
   *
   *   0   No restrictions
   *   1   Images are encoded only with PNG [PNG] or JPEG [JFIF].
   *
   * t - Image size restrictions
   *
   *   00  No restrictions
   *   01  All images are 256x256 pixels or smaller.
   *   10  All images are 64x64 pixels or smaller.
   *   11  All images are exactly 64x64 pixels, unless required
   *       otherwise.
   */
  setTagRestrictions(
    size: number,
    textEncoding: number,
    textSize: number,
    imageEncoding: number,
    imageSize: number
  ): ID3v2TagContents {
    if (!this._hasExtendedHeader) {
      this._initExtendedHeader();
    }

    if (this._major === 4) {
      this._setBitAtOffset(EXTENDED_FLAGS_V4, 4);
      // 0x03 = 0b11
      this._addExtendedHeaderData('RESTRICTIONS', [
        (size & 0x3) << 6 |
        (textEncoding & 0x1) << 5 |
        (textSize & 0x3) << 3 |
        (imageEncoding & 0x1) << 2 |
        (imageSize & 0x3) << 1
      ]);
    }

    return this;
  }

  addFrame(
    id: string,
    data: ByteArray,
    flags?: TagFrameFlags
  ): ID3v2TagContents {
    var size = 0;
    var frameFlags = [0, 0];

    if (this._major === 2) {
      size = getInteger24(data.length);
    } else if (this._major === 3) {
      size = getInteger32(data.length);
      if (flags) {
        frameFlags[0] |= (flags.message.tag_alter_preservation ? 1 : 0) << 7;
        frameFlags[0] |= (flags.message.file_alter_preservation ? 1 : 0) << 6;
        frameFlags[0] |= (flags.message.read_only ? 1 : 0) << 5;
        frameFlags[1] |= (flags.format.compression ? 1 : 0) << 7;
        frameFlags[1] |= (flags.format.encryption ? 1 : 0) << 6;
        frameFlags[1] |= (flags.format.grouping_identify ? 1 : 0) << 5;
      }
    } else if (this._major === 4) {
      size = getSynchsafeInteger32(data.length);
      if (flags) {
        frameFlags[0] |= (flags.message.tag_alter_preservation ? 1 : 0) << 6;
        frameFlags[0] |= (flags.message.file_alter_preservation ? 1 : 0) << 5;
        frameFlags[0] |= (flags.message.read_only ? 1 : 0) << 4;
        frameFlags[1] |= (flags.format.grouping_identify ? 1 : 0) << 6;
        frameFlags[1] |= (flags.format.compression ? 1 : 0) << 3;
        frameFlags[1] |= (flags.format.encryption ? 1 : 0) << 2;
        frameFlags[1] |= (flags.format.unsynchronisation ? 1 : 0) << 1;
        frameFlags[1] |= flags.format.data_length_indicator ? 1 : 0;
      }
    } else {
      throw Error("Major version not supported");
    }

    var frame = [].concat(
      bin(id),
      size,
      frameFlags,
      data
    );
    this._frames[id] = frame;
    this._addData(this._nextFrameOffset, frame);

    this._updateSize();
    return this;
  }

  _addExtendedHeaderData(tagKey: string, tagData: ByteArray) {
    var offset = START_EXTENDED_DATA_V4;

    // Each flag that is set in the extended header has data attached, which
    // comes in the order in which the flags are encountered (i.e. the data
    // for flag 'b' comes before the data for flag 'c').
    // _extendedHeader keeps track of which tag data we have by storing the
    // size of the data. To know where to add a particular tag data we just need
    // to sum all the data lengths of the tags that come before this tagKey
    // because the keys in the map are in order.
    for (var key in this._extendedHeader) {
      if (this._extendedHeader.hasOwnProperty(key)) {
        if (key === tagKey) {
          break;
        } else {
          offset += this._extendedHeader[key];
        }
      }
    }

    var data = [tagData.length].concat(tagData);
    this._extendedHeader[tagKey] = data.length;
    this._addData(offset, data);
  }

  _initExtendedHeader() {
    this._hasExtendedHeader = true;

    if (this._major === 3) {
      this._addData(EXTENDED_HEADER, [
        0, 0, 0, 6, // size
        0, 0, // flags
        0, 0, 0, 0 // padding
      ]);
    } else if (this._major === 4) {
      this._addData(EXTENDED_HEADER, [].concat(
        getSynchsafeInteger32(6), // size
        [1], // number of flag bytes
        [0] // extended flags
      ));
    } else {
      throw new Error("Version doesn't support extended header.");
    }
  }

  _updateSize() {
    // Header (10 bytes) is not included in the size.
    var size = 0;

    if (this._hasExtendedHeader) {
      // Extended header size
      size += this._major === 4 ? 6 : 10;
      // Extended header data size
      for (var key in this._extendedHeader) {
        if (this._extendedHeader.hasOwnProperty(key)) {
          size += this._extendedHeader[key];
        }
      }
    }

    for (var frameId in this._frames) {
      if (this._frames.hasOwnProperty(frameId)) {
        size += this._frames[frameId].length;
      }
    }

    this._nextFrameOffset = size + HEADER_SIZE;

    this._size = size;
    this._setData(SIZE, getSynchsafeInteger32(size));
  }

  _setBitAtOffset(offset: number, bit: number) {
    var data = this._getData(offset, 1);
    data[0] |= 1<<bit;
    this._setData(offset, data);
  }

  _getData(offset: number, length: number): ByteArray {
    return this._contents.slice(offset, offset+length);
  }

  _setData(offset: number, data: ByteArray) {
    this._contents.splice.apply(this._contents, [
      offset,
      data.length,
    ].concat(data));
  }

  _addData(offset: number, data: ByteArray) {
    this._contents.splice.apply(this._contents, [
      offset,
      0,
    ].concat(data));
  }
}

module.exports = ID3v2TagContents;
