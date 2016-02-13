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

class ID3v2TagReader extends MediaTagReader {
  static getTagIdentifierByteRange(): ByteRange {
    // ID3 header
    return {
      offset: 0,
      length: 10
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
          [0, mediaFileReader.getSynchsafeInteger32At(6)],
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

    if (unsynch) {
      var frames = {};
    } else {
      var frames = this._readFrames(offset, size-10, data, id3, tags);
    }

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

  /**
   * All the frames consists of a frame header followed by one or more fields
   * containing the actual information.
   * The frame ID made out of the characters capital A-Z and 0-9. Identifiers
   * beginning with "X", "Y" and "Z" are for experimental use and free for
   * everyone to use, without the need to set the experimental bit in the tag
   * header. Have in mind that someone else might have used the same identifier
   * as you. All other identifiers are either used or reserved for future use.
   * The frame ID is followed by a size descriptor, making a total header size
   * of ten bytes in every frame. The size is calculated as frame size excluding
   * frame header (frame size - 10).
   */
  _readFrames(
    offset: number,
    end: number,
    data: MediaFileReader,
    id3header: TagHeader,
    tags: ?Array<string>
  ): TagFrames {
    var frames = {};

    if (tags) {
      tags = this._expandShortcutTags(tags);
    }

    while (offset < end) {
      var header = this._readFrameHeader(data, offset, id3header);
      var frameId = header.id;

      // If the header size is 0 then we're probably hit the padding if it
      // exists.
      if (header.size === 0) {
        break;
      }
      // No frame ID sometimes means it's the last frame (GTFO).
      if (!frameId) {
        break;
      }

      var flags = header.flags;
      var frameSize = header.size;
      var frameDataOffset = offset + header.headerSize;

      // advance data offset to the next frame data
      offset += header.headerSize + header.size;

      // skip unwanted tags
      if (tags && tags.indexOf(frameId) === -1) {
        continue;
      }

      // TODO: support unsynchronisation
      if (flags && flags.format.unsynchronisation) {
        continue;
      }

      // the first 4 bytes are the real data size
      // (after unsynchronisation && encryption)
      if (flags && flags.format.data_length_indicator) {
        // var frameDataSize = readSynchsafeInteger32At(frameDataOffset, frameData);
        frameDataOffset += 4;
        frameSize -= 4;
      }

      var readFrameFunc = ID3v2FrameReader.getFrameReaderFunction(frameId);
      var parsedData = readFrameFunc ? readFrameFunc(frameDataOffset, frameSize, data, flags) : null;
      var desc = this._getFrameDescription(frameId);

      var frame = {
        id: frameId,
        size: frameSize,
        description: desc,
        data: parsedData
      };

      if( frameId in frames ) {
        if( frames[frameId].id ) {
          frames[frameId] = [frames[frameId]];
        }
        frames[frameId].push(frame);
      } else {
        frames[frameId] = frame;
      }
    }

    return frames;
  }

  _readFrameHeader(
    data: MediaFileReader,
    offset: number,
    id3header: TagHeader
  ): TagFrameHeader {
    var major = id3header.major;
    var flags = null;

    switch (major) {
      case 2:
      var frameId = data.getStringAt(offset, 3);
      var frameSize = data.getInteger24At(offset+3, true);
      var frameHeaderSize = 6;
      break;

      case 3:
      var frameId = data.getStringAt(offset, 4);
      var frameSize = data.getLongAt(offset+4, true);
      var frameHeaderSize = 10;
      break;

      case 4:
      var frameId = data.getStringAt(offset, 4);
      var frameSize = data.getSynchsafeInteger32At(offset+4);
      var frameHeaderSize = 10;
      break;
    }

    // if frameId is empty then it's the last frame
    if (frameId) {
      // read frame message and format flags
      if (major > 2) {
        flags = this._readFrameFlags(data, offset+8);
      }
    }

    return {
      "id": frameId,
      "size": frameSize,
      "headerSize": frameHeaderSize,
      "flags": flags
    };
  }

  _readFrameFlags(data: MediaFileReader, offset: number): TagFrameFlags {
    return {
      message: {
        tag_alter_preservation  : data.isBitSetAt(offset, 6),
        file_alter_preservation : data.isBitSetAt(offset, 5),
        read_only               : data.isBitSetAt(offset, 4)
      },
      format: {
        grouping_identity       : data.isBitSetAt(offset+1, 7),
        compression             : data.isBitSetAt(offset+1, 3),
        encryption              : data.isBitSetAt(offset+1, 2),
        unsynchronisation       : data.isBitSetAt(offset+1, 1),
        data_length_indicator   : data.isBitSetAt(offset+1, 0)
      }
    };
  }

  _getFrameData(frames: TagFrames, ids: Array<string>): ?Object {
    for (var i = 0, id; id = ids[i]; i++ ) {
      if (id in frames) {
        return frames[id].data;
      }
    }
  }

  _getFrameDescription(frameId: string): string {
    if (frameId in FRAME_DESCRIPTIONS) {
      return FRAME_DESCRIPTIONS[frameId];
    } else {
      return 'Unknown';
    }
  }

  getShortcuts(): {[key: string]: string|Array<string>} {
    return SHORTCUTS;
  }
}

const FRAME_DESCRIPTIONS = {
  // v2.2
  "BUF" : "Recommended buffer size",
  "CNT" : "Play counter",
  "COM" : "Comments",
  "CRA" : "Audio encryption",
  "CRM" : "Encrypted meta frame",
  "ETC" : "Event timing codes",
  "EQU" : "Equalization",
  "GEO" : "General encapsulated object",
  "IPL" : "Involved people list",
  "LNK" : "Linked information",
  "MCI" : "Music CD Identifier",
  "MLL" : "MPEG location lookup table",
  "PIC" : "Attached picture",
  "POP" : "Popularimeter",
  "REV" : "Reverb",
  "RVA" : "Relative volume adjustment",
  "SLT" : "Synchronized lyric/text",
  "STC" : "Synced tempo codes",
  "TAL" : "Album/Movie/Show title",
  "TBP" : "BPM (Beats Per Minute)",
  "TCM" : "Composer",
  "TCO" : "Content type",
  "TCR" : "Copyright message",
  "TDA" : "Date",
  "TDY" : "Playlist delay",
  "TEN" : "Encoded by",
  "TFT" : "File type",
  "TIM" : "Time",
  "TKE" : "Initial key",
  "TLA" : "Language(s)",
  "TLE" : "Length",
  "TMT" : "Media type",
  "TOA" : "Original artist(s)/performer(s)",
  "TOF" : "Original filename",
  "TOL" : "Original Lyricist(s)/text writer(s)",
  "TOR" : "Original release year",
  "TOT" : "Original album/Movie/Show title",
  "TP1" : "Lead artist(s)/Lead performer(s)/Soloist(s)/Performing group",
  "TP2" : "Band/Orchestra/Accompaniment",
  "TP3" : "Conductor/Performer refinement",
  "TP4" : "Interpreted, remixed, or otherwise modified by",
  "TPA" : "Part of a set",
  "TPB" : "Publisher",
  "TRC" : "ISRC (International Standard Recording Code)",
  "TRD" : "Recording dates",
  "TRK" : "Track number/Position in set",
  "TSI" : "Size",
  "TSS" : "Software/hardware and settings used for encoding",
  "TT1" : "Content group description",
  "TT2" : "Title/Songname/Content description",
  "TT3" : "Subtitle/Description refinement",
  "TXT" : "Lyricist/text writer",
  "TXX" : "User defined text information frame",
  "TYE" : "Year",
  "UFI" : "Unique file identifier",
  "ULT" : "Unsychronized lyric/text transcription",
  "WAF" : "Official audio file webpage",
  "WAR" : "Official artist/performer webpage",
  "WAS" : "Official audio source webpage",
  "WCM" : "Commercial information",
  "WCP" : "Copyright/Legal information",
  "WPB" : "Publishers official webpage",
  "WXX" : "User defined URL link frame",
  // v2.3
  "AENC" : "Audio encryption",
  "APIC" : "Attached picture",
  "ASPI" : "Audio seek point index",
  "COMM" : "Comments",
  "COMR" : "Commercial frame",
  "ENCR" : "Encryption method registration",
  "EQU2" : "Equalisation (2)",
  "EQUA" : "Equalization",
  "ETCO" : "Event timing codes",
  "GEOB" : "General encapsulated object",
  "GRID" : "Group identification registration",
  "IPLS" : "Involved people list",
  "LINK" : "Linked information",
  "MCDI" : "Music CD identifier",
  "MLLT" : "MPEG location lookup table",
  "OWNE" : "Ownership frame",
  "PRIV" : "Private frame",
  "PCNT" : "Play counter",
  "POPM" : "Popularimeter",
  "POSS" : "Position synchronisation frame",
  "RBUF" : "Recommended buffer size",
  "RVA2" : "Relative volume adjustment (2)",
  "RVAD" : "Relative volume adjustment",
  "RVRB" : "Reverb",
  "SEEK" : "Seek frame",
  "SYLT" : "Synchronized lyric/text",
  "SYTC" : "Synchronized tempo codes",
  "TALB" : "Album/Movie/Show title",
  "TBPM" : "BPM (beats per minute)",
  "TCOM" : "Composer",
  "TCON" : "Content type",
  "TCOP" : "Copyright message",
  "TDAT" : "Date",
  "TDLY" : "Playlist delay",
  "TDRC" : "Recording time",
  "TDRL" : "Release time",
  "TDTG" : "Tagging time",
  "TENC" : "Encoded by",
  "TEXT" : "Lyricist/Text writer",
  "TFLT" : "File type",
  "TIME" : "Time",
  "TIPL" : "Involved people list",
  "TIT1" : "Content group description",
  "TIT2" : "Title/songname/content description",
  "TIT3" : "Subtitle/Description refinement",
  "TKEY" : "Initial key",
  "TLAN" : "Language(s)",
  "TLEN" : "Length",
  "TMCL" : "Musician credits list",
  "TMED" : "Media type",
  "TMOO" : "Mood",
  "TOAL" : "Original album/movie/show title",
  "TOFN" : "Original filename",
  "TOLY" : "Original lyricist(s)/text writer(s)",
  "TOPE" : "Original artist(s)/performer(s)",
  "TORY" : "Original release year",
  "TOWN" : "File owner/licensee",
  "TPE1" : "Lead performer(s)/Soloist(s)",
  "TPE2" : "Band/orchestra/accompaniment",
  "TPE3" : "Conductor/performer refinement",
  "TPE4" : "Interpreted, remixed, or otherwise modified by",
  "TPOS" : "Part of a set",
  "TPRO" : "Produced notice",
  "TPUB" : "Publisher",
  "TRCK" : "Track number/Position in set",
  "TRDA" : "Recording dates",
  "TRSN" : "Internet radio station name",
  "TRSO" : "Internet radio station owner",
  "TSOA" : "Album sort order",
  "TSOP" : "Performer sort order",
  "TSOT" : "Title sort order",
  "TSIZ" : "Size",
  "TSRC" : "ISRC (international standard recording code)",
  "TSSE" : "Software/Hardware and settings used for encoding",
  "TSST" : "Set subtitle",
  "TYER" : "Year",
  "TXXX" : "User defined text information frame",
  "UFID" : "Unique file identifier",
  "USER" : "Terms of use",
  "USLT" : "Unsychronized lyric/text transcription",
  "WCOM" : "Commercial information",
  "WCOP" : "Copyright/Legal information",
  "WOAF" : "Official audio file webpage",
  "WOAR" : "Official artist/performer webpage",
  "WOAS" : "Official audio source webpage",
  "WORS" : "Official internet radio station homepage",
  "WPAY" : "Payment",
  "WPUB" : "Publishers official webpage",
  "WXXX" : "User defined URL link frame"
};

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
