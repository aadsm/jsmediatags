/**
 * Support for iTunes-style m4a tags
 * See:
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 *   http://developer.apple.com/mac/library/documentation/QuickTime/QTFF/Metadata/Metadata.html
 * Authored by Joshua Kifer <joshua.kifer gmail.com>
 * @flow
 */
'use strict';

var MediaTagReader = require('./MediaTagReader');
var MediaFileReader = require('./MediaFileReader');

import type {
  CallbackType,
  LoadCallbackType,
  CharsetType,
  ByteRange,
  TagType,
  TagFrame
} from './FlowTypes';

class MP4TagReader extends MediaTagReader {
  static getTagIdentifierByteRange(): ByteRange {
    // The tag identifier is located in [4, 8] but since we'll need to reader
    // the header of the first block anyway, we load it instead to avoid
    // making two requests.
    return {
      offset: 0,
      length: 16
    };
  }

  static canReadTagFormat(tagIdentifier: Array<number>): boolean {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(4, 8));
    return id === "ftyp";
  }

  _loadData(mediaFileReader: MediaFileReader, callbacks: LoadCallbackType) {
    // MP4 metadata isn't located in a specific location of the file. Roughly
    // speaking, it's composed of blocks chained together like a linked list.
    // These blocks are called atoms (or boxes).
    // Each atom of the list can have its own child linked list. Atoms in this
    // situation do not possess any data and are called "container" as they only
    // contain other atoms.
    // Other atoms represent a particular set of data, like audio, video or
    // metadata. In order to find and load all the interesting atoms we need
    // to traverse the entire linked list of atoms and only load the ones
    // associated with metadata.
    // The metadata atoms can be find under the "moov.udta.meta.ilst" hierarchy.

    var self = this;
    // Load the header of the first atom
    mediaFileReader.loadRange([0, 16], {
      onSuccess: function() {
        self._loadAtom(mediaFileReader, 0, "", callbacks);
      },
      onError: callbacks.onError
    });
  }

  _loadAtom(
    mediaFileReader: MediaFileReader,
    offset: number,
    parentAtomFullName: string,
    callbacks: LoadCallbackType
  ) {
    if (offset >= mediaFileReader.getSize()) {
      callbacks.onSuccess();
      return;
    }

    var self = this;
    // 8 is the size of the atomSize and atomName fields.
    // When reading the current block we always read 8 more bytes in order
    // to also read the header of the next block.
    var atomSize = mediaFileReader.getLongAt(offset, true);
    if (atomSize == 0 || isNaN(atomSize)) {
      callbacks.onSuccess();
      return;
    }
    var atomName = mediaFileReader.getStringAt(offset + 4, 4);
    // console.log(parentAtomFullName, atomName, atomSize);
    // Container atoms (no actual data)
    if (this._isContainerAtom(atomName)) {
      if (atomName == "meta") {
        // The "meta" atom breaks convention and is a container with data.
        offset += 4; // next_item_id (uint32)
      }
      var atomFullName = (parentAtomFullName ? parentAtomFullName+"." : "") + atomName;
      if (atomFullName === "moov.udta.meta.ilst") {
        mediaFileReader.loadRange([offset, offset + atomSize], callbacks);
      } else {
        mediaFileReader.loadRange([offset+8, offset+8 + 8], {
          onSuccess: function() {
            self._loadAtom(mediaFileReader, offset + 8, atomFullName, callbacks);
          },
          onError: callbacks.onError
        });
      }
    } else {
      mediaFileReader.loadRange([offset+atomSize, offset+atomSize + 8], {
        onSuccess: function() {
          self._loadAtom(mediaFileReader, offset+atomSize, parentAtomFullName, callbacks);
        },
        onError: callbacks.onError
      });
    }
  }

  _isContainerAtom(atomName: string): boolean {
    return ["moov", "udta", "meta", "ilst"].indexOf(atomName) >= 0;
  }

  _canReadAtom(atomName: string): boolean {
    return atomName !== "----";
  }

  _parseData(data: MediaFileReader, tagsToRead: ?Array<string>): TagType {
    var tags = {};

    tagsToRead = this._expandShortcutTags(tagsToRead);
    this._readAtom(tags, data, 0, data.getSize(), tagsToRead);

    // create shortcuts for most common data.
    for (var name in SHORTCUTS) if (SHORTCUTS.hasOwnProperty(name)) {
      var tag = tags[SHORTCUTS[name]];
      if (tag) {
        if (name === "track") {
          tags[name] = tag.data.track;
        } else {
          tags[name] = tag.data;
        }
      }
    }

    return {
      "type": "MP4",
      "ftyp": data.getStringAt(8, 4),
      "version": data.getLongAt(12, true),
      "tags": tags
    };
  }

  _readAtom(
    tags: Object,
    data: MediaFileReader,
    offset: number,
    length: number,
    tagsToRead: ?Array<string>,
    parentAtomFullName?: string,
    indent?: string
  ) {
    indent = indent === undefined ? "" : indent + "  ";

    var seek = offset;
    while (seek < offset + length) {
      var atomSize = data.getLongAt(seek, true);
      if (atomSize == 0) {
        return;
      }
      var atomName = data.getStringAt(seek + 4, 4);

      // console.log(seek, parentAtomFullName, atomName, atomSize);
      if (this._isContainerAtom(atomName)) {
        if (atomName == "meta") {
          seek += 4; // next_item_id (uint32)
        }
        var atomFullName = (parentAtomFullName ? parentAtomFullName+"." : "") + atomName;
        this._readAtom(tags, data, seek + 8, atomSize - 8, tagsToRead, atomFullName, indent);
        return;
      }

      // Value atoms
      if (
        (!tagsToRead || tagsToRead.indexOf(atomName) >= 0) &&
        parentAtomFullName === "moov.udta.meta.ilst" &&
        this._canReadAtom(atomName)
      ) {
        tags[atomName] = this._readMetadataAtom(data, seek);
      }

      seek += atomSize;
    }
  }

  _readMetadataAtom(data: MediaFileReader, offset: number): TagFrame {
    // 16: name + size + "data" + size (4 bytes each)
    const METADATA_HEADER = 16;

    var atomSize = data.getLongAt(offset, true);
    var atomName = data.getStringAt(offset + 4, 4);

    var klass = data.getInteger24At(offset + METADATA_HEADER + 1, true);
    var type = TYPES[klass];
    var atomData;

    if (atomName == "trkn") {
      atomData = {
        "track": data.getByteAt(offset + METADATA_HEADER + 11),
        "total": data.getByteAt(offset + METADATA_HEADER + 13)
      };
    } else {
      // 4: atom version (1 byte) + atom flags (3 bytes)
      // 4: NULL (usually locale indicator)
      var atomHeader = METADATA_HEADER + 4 + 4;
      var dataStart = offset + atomHeader;
      var dataLength = atomSize - atomHeader;
      var atomData;

      // Workaround for covers being parsed as 'uint8' type despite being an 'covr' atom
      if (atomName === 'covr' && type === 'uint8') {
        type = 'jpeg'
      }

      switch (type) {
        case "text":
        atomData = data.getStringWithCharsetAt(dataStart, dataLength, "utf-8").toString();
        break;

        case "uint8":
        atomData = data.getShortAt(dataStart, false);
        break;

        case "jpeg":
        case "png":
        atomData = {
          "format": "image/" + type,
          "data": data.getBytesAt(dataStart, dataLength)
        };
        break;
      }
    }

    return {
      id: atomName,
      size: atomSize,
      description: ATOM_DESCRIPTIONS[atomName] || "Unknown",
      data: atomData
    };
  }

  getShortcuts(): {[key: string]: string|Array<string>} {
    return SHORTCUTS;
  }
}

const TYPES = {
  "0": "uint8",
  "1": "text",
  "13": "jpeg",
  "14": "png",
  "21": "uint8"
};

const ATOM_DESCRIPTIONS = {
  "©alb": "Album",
  "©ART": "Artist",
  "aART": "Album Artist",
  "©day": "Release Date",
  "©nam": "Title",
  "©gen": "Genre",
  "gnre": "Genre",
  "trkn": "Track Number",
  "©wrt": "Composer",
  "©too": "Encoding Tool",
  "©enc": "Encoded By",
  "cprt": "Copyright",
  "covr": "Cover Art",
  "©grp": "Grouping",
  "keyw": "Keywords",
  "©lyr": "Lyrics",
  "©cmt": "Comment",
  "tmpo": "Tempo",
  "cpil": "Compilation",
  "disk": "Disc Number",
  "tvsh": "TV Show Name",
  "tven": "TV Episode ID",
  "tvsn": "TV Season",
  "tves": "TV Episode",
  "tvnn": "TV Network",
  "desc": "Description",
  "ldes": "Long Description",
  "sonm": "Sort Name",
  "soar": "Sort Artist",
  "soaa": "Sort Album",
  "soco": "Sort Composer",
  "sosn": "Sort Show",
  "purd": "Purchase Date",
  "pcst": "Podcast",
  "purl": "Podcast URL",
  "catg": "Category",
  "hdvd": "HD Video",
  "stik": "Media Type",
  "rtng": "Content Rating",
  "pgap": "Gapless Playback",
  "apID": "Purchase Account",
  "sfID": "Country Code",
};

const UNSUPPORTED_ATOMS = {
  "----": 1,
};

const SHORTCUTS = {
  "title"     : "©nam",
  "artist"    : "©ART",
  "album"     : "©alb",
  "year"      : "©day",
  "comment"   : "©cmt",
  "track"     : "trkn",
  "genre"     : "©gen",
  "picture"   : "covr",
  "lyrics"    : "©lyr"
};

module.exports = MP4TagReader;
