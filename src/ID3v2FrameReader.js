/**
 * @flow
 */
'use strict';

var MediaFileReader = require('./MediaFileReader');

import type {
  CharsetType,
  FrameReaderSignature
} from './FlowTypes';

var ID3v2FrameReader = {
  getFrameReaderFunction: function(frameId: string): ?FrameReaderSignature {
    if (frameId in frameReaderFunctions) {
      return frameReaderFunctions[frameId];
    } else if (frameId[0] === "T") {
      // All frame ids starting with T are text tags.
      return frameReaderFunctions["T*"];
    } else {
      return null;
    }
  }
};

var frameReaderFunctions = {};

frameReaderFunctions['APIC'] = function readPictureFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
): any {
  majorVersion = majorVersion || '3';

  var start = offset;
  var charset = getTextEncoding(data.getByteAt(offset));
  switch (majorVersion) {
    case '2':
    var format = data.getStringAt(offset+1, 3);
    offset += 4;
    break;

    case '3':
    case '4':
    var format = data.getStringWithCharsetAt(offset+1, length - (offset-start));
    offset += 1 + format.bytesReadCount;
    break;
  }
  var bite = data.getByteAt(offset, 1);
  var type = PICTURE_TYPE[bite];
  var desc = data.getStringWithCharsetAt(offset+1, length - (offset-start), charset);

  offset += 1 + desc.bytesReadCount;

  return {
    "format" : format.toString(),
    "type" : type,
    "description" : desc.toString(),
    "data" : data.getBytesAt(offset, (start+length) - offset)
  };
};

frameReaderFunctions['COMM'] = function readCommentsFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
): any {
  var start = offset;
  var charset = getTextEncoding(data.getByteAt(offset));
  var language = data.getStringAt( offset+1, 3 );
  var shortdesc = data.getStringWithCharsetAt(offset+4, length-4, charset);

  offset += 4 + shortdesc.bytesReadCount;
  var text = data.getStringWithCharsetAt( offset, (start+length) - offset, charset );

  return {
    language : language,
    short_description : shortdesc.toString(),
    text : text.toString()
  };
};

frameReaderFunctions['COM'] = frameReaderFunctions['COMM'];

frameReaderFunctions['PIC'] = function(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
): any {
  return frameReaderFunctions['APIC'](offset, length, data, flags, '2');
};

frameReaderFunctions['PCNT'] = function readCounterFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
): any {
  // FIXME: implement the rest of the spec
  return data.getLongAt(offset, false);
};

frameReaderFunctions['CNT'] = frameReaderFunctions['PCNT'];

frameReaderFunctions['T*'] = function readTextFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
): any {
  var charset = getTextEncoding(data.getByteAt(offset));

  return data.getStringWithCharsetAt(offset+1, length-1, charset).toString();
};

frameReaderFunctions['TCON'] = function readGenreFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object
): any {
  var text = frameReaderFunctions['T*'].apply(this, arguments);
  return (text: string).replace(/^\(\d+\)/, '');
};

frameReaderFunctions['TCO'] = frameReaderFunctions['TCON'];

frameReaderFunctions['USLT'] = function readLyricsFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
): any {
  var start = offset;
  var charset = getTextEncoding(data.getByteAt(offset));
  var language = data.getStringAt(offset+1, 3);
  var descriptor = data.getStringWithCharsetAt(offset+4, length-4, charset);

  offset += 4 + descriptor.bytesReadCount;
  var lyrics = data.getStringWithCharsetAt( offset, (start+length) - offset, charset );

  return {
    language : language,
    descriptor : descriptor.toString(),
    lyrics : lyrics.toString()
  };
};

frameReaderFunctions['ULT'] = frameReaderFunctions['USLT'];

function getTextEncoding(bite): ?CharsetType {
  var charset: ?CharsetType;

  switch (bite)
  {
    case 0x00:
    charset = 'iso-8859-1';
    break;

    case 0x01:
    charset = 'utf-16';
    break;

    case 0x02:
    charset = 'utf-16be';
    break;

    case 0x03:
    charset = 'utf-8';
    break;
  }

  return charset;
}

var PICTURE_TYPE = [
  "Other",
  "32x32 pixels 'file icon' (PNG only)",
  "Other file icon",
  "Cover (front)",
  "Cover (back)",
  "Leaflet page",
  "Media (e.g. label side of CD)",
  "Lead artist/lead performer/soloist",
  "Artist/performer",
  "Conductor",
  "Band/Orchestra",
  "Composer",
  "Lyricist/text writer",
  "Recording Location",
  "During recording",
  "During performance",
  "Movie/video screen capture",
  "A bright coloured fish",
  "Illustration",
  "Band/artist logotype",
  "Publisher/Studio logotype"
];

module.exports = ID3v2FrameReader;
