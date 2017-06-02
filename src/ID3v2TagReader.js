/**
 * @flow
 */
'use strict';

var MediaTagReader = require('./MediaTagReader');
var MediaFileReader = require('./MediaFileReader');
var ID3v2FrameReader = require('./ID3v2FrameReader');

import type {
  CallbackType,
  LoadCallbackType,
  TagFrames,
  TagHeader,
  TagFrameHeader,
  TagFrameFlags,
  CharsetType,
  ByteRange,
  TagType,
} from './FlowTypes';

const ID3_HEADER_SIZE = 10;

class ID3v2TagReader extends MediaTagReader {
  static getTagIdentifierByteRange(): ByteRange {
    // ID3 header
    return {
      offset: 0,
      length: ID3_HEADER_SIZE
    };
  }

  static canReadTagFormat(tagIdentifier: Array<number>): boolean {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(0, 3));
    return id === 'ID3';
  }

  _loadData(mediaFileReader: MediaFileReader, callbacks: LoadCallbackType) {
    mediaFileReader.loadRange([6, 9], {
      onSuccess: function() {
        mediaFileReader.loadRange(
          // The tag size does not include the header size.
          [0, ID3_HEADER_SIZE + mediaFileReader.getSynchsafeInteger32At(6) - 1],
          callbacks
        );
      },
      onError: callbacks.onError
    });
  }

  _parseData(data: MediaFileReader, tags: ?Array<string>): TagType {
    var offset = 0;
    var major = data.getByteAt(offset+3);
    if (major > 4) { return {"type": "ID3", "version": ">2.4", "tags": {}}; }
    var revision = data.getByteAt(offset+4);
    var unsynch = data.isBitSetAt(offset+5, 7);
    var xheader = data.isBitSetAt(offset+5, 6);
    var xindicator = data.isBitSetAt(offset+5, 5);
    var size = data.getSynchsafeInteger32At(offset+6);
    offset += 10;

    if( xheader ) {
      // TODO: support 2.4
      var xheadersize = data.getLongAt(offset, true);
      // The 'Extended header size', currently 6 or 10 bytes, excludes itself.
      offset += xheadersize + 4;
    }

    var id3 = {
      "type": "ID3",
      "version" : '2.' + major + '.' + revision,
      "major" : major,
      "revision" : revision,
      "flags" : {
        "unsynchronisation" : unsynch,
        "extended_header" : xheader,
        "experimental_indicator" : xindicator,
        // TODO: footer_present
        "footer_present" : false
      },
      "size" : size,
      "tags": {},
    };

    if (tags) {
      var expandedTags = this._expandShortcutTags(tags);
    }

    var frames = ID3v2FrameReader.readFrames(offset, size + 10/*header size*/, data, id3, expandedTags);
    // create shortcuts for most common data.
    for (var name in SHORTCUTS) if (SHORTCUTS.hasOwnProperty(name)) {
      var frameData = this._getFrameData(frames, SHORTCUTS[name]);
      if (frameData) {
        id3.tags[name] = frameData;
      }
    }

    for (var frame in frames) if (frames.hasOwnProperty(frame)) {
      id3.tags[frame] = frames[frame];
    }

    return id3;
  }

  _getFrameData(frames: TagFrames, ids: Array<string>): ?Object {
    for (var i = 0, id; id = ids[i]; i++ ) {
      if (id in frames) {
        return frames[id].data;
      }
    }
  }

  getShortcuts(): {[key: string]: string|Array<string>} {
    return SHORTCUTS;
  }
}


const SHORTCUTS = {
  "title"     : ["TIT2", "TT2"],
  "artist"    : ["TPE1", "TP1"],
  "album"     : ["TALB", "TAL"],
  "year"      : ["TYER", "TYE"],
  "comment"   : ["COMM", "COM"],
  "track"     : ["TRCK", "TRK"],
  "genre"     : ["TCON", "TCO"],
  "picture"   : ["APIC", "PIC"],
  "lyrics"    : ["USLT", "ULT"]
};

module.exports = ID3v2TagReader;
