/**
 * @flow
 */
'use strict';

var MediaFileReader = require('./MediaFileReader');
const StringUtils = require('./StringUtils');
var ArrayFileReader = require('./ArrayFileReader');

import type {
  CharsetType,
  FrameReaderSignature
} from './FlowTypes';

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
  "CHAP" : "Chapter",
  "CTOC" : "Table of contents",
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

class ID3v2FrameReader {
  static getFrameReaderFunction(frameId: string): ?FrameReaderSignature {
    if (frameId in frameReaderFunctions) {
      return frameReaderFunctions[frameId];
    } else if (frameId[0] === "T") {
      // All frame ids starting with T are text tags.
      return frameReaderFunctions["T*"];
    } else if (frameId[0] === "W") {
      // All frame ids starting with W are url tags.
      return frameReaderFunctions["W*"];
    } else {
      return null;
    }
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
  static readFrames(
    offset: number,
    end: number,
    data: MediaFileReader,
    id3header: TagHeader,
    tags: ?Array<string>
  ): TagFrames {
    var frames = {};

    while (offset < end) {
      var header = this._readFrameHeader(data, offset, id3header);
      var frameId = header.id;

      // No frame ID sometimes means it's the last frame (GTFO).
      if (!frameId) {
        break;
      }

      var flags = header.flags;
      var frameSize = header.size;
      var frameDataOffset = offset + header.headerSize;
      var frameData = data;

      // advance data offset to the next frame data
      offset += header.headerSize + header.size;

      // skip unwanted tags
      if (tags && tags.indexOf(frameId) === -1) {
        continue;
      }

      var unsyncData;
      if (
        id3header.flags.unsynchronisation ||
        (flags && flags.format.unsynchronisation)
      ) {
        frameData = this._getUnsyncFileReader(frameData, frameDataOffset, frameSize);
        frameDataOffset = 0;
        frameSize = frameData.getSize();
      }

      // the first 4 bytes are the real data size
      // (after unsynchronisation && encryption)
      if (flags && flags.format.data_length_indicator) {
        // var frameDataSize = frameData.getSynchsafeInteger32At(frameDataOffset);
        frameDataOffset += 4;
        frameSize -= 4;
      }

      var readFrameFunc = ID3v2FrameReader.getFrameReaderFunction(frameId);
      var parsedData = readFrameFunc ? readFrameFunc.apply(this, [frameDataOffset, frameSize, frameData, flags, id3header]) : null;
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

  static _readFrameHeader(
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

    if (
      frameId == String.fromCharCode(0,0,0) ||
      frameId == String.fromCharCode(0,0,0,0)
    ) {
      frameId = "";
    }

    // if frameId is empty then it's the last frame
    if (frameId) {
      // read frame message and format flags
      if (major > 2) {
        flags = this._readFrameFlags(data, offset+8);
      }
    }

    return {
      "id": frameId || "",
      "size": frameSize || 0,
      "headerSize": frameHeaderSize || 0,
      "flags": flags
    };
  }

  static _readFrameFlags(data: MediaFileReader, offset: number): TagFrameFlags {
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

  static _getFrameDescription(frameId: string): string {
    if (frameId in FRAME_DESCRIPTIONS) {
      return FRAME_DESCRIPTIONS[frameId];
    } else {
      return 'Unknown';
    }
  }

  static _getUnsyncFileReader(
    data: MediaFileReader,
    offset: number,
    size: number
  ): MediaFileReader {
    var frameData = data.getBytesAt(offset, size);
    for (var i = 0; i < frameData.length - 1; i++) {
      if (frameData[i] === 0xff && frameData[i+1] === 0x00) {
        frameData.splice(i+1, 1);
      }
    }

    return new ArrayFileReader(frameData);
  }
};

var frameReaderFunctions = {};

frameReaderFunctions['APIC'] = function readPictureFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  id3header?: TagHeader
): any {
  var start = offset;
  var charset = getTextEncoding(data.getByteAt(offset));
  switch (id3header && id3header.major) {
    case 2:
    var format = data.getStringAt(offset+1, 3);
    offset += 4;
    break;

    case 3:
    case 4:
    var format = data.getStringWithCharsetAt(offset+1, length - 1);
    offset += 1 + format.bytesReadCount;
    break;

    default:
    throw new Error("Couldn't read ID3v2 major version.");
  }
  var bite = data.getByteAt(offset, 1);
  var type = PICTURE_TYPE[bite];
  var desc = data.getStringWithCharsetAt(offset+1, length - (offset-start) - 1, charset);

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
  id3header?: TagHeader
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
  id3header?: TagHeader
): any {
  return frameReaderFunctions['APIC'](offset, length, data, flags, id3header);
};

frameReaderFunctions['PCNT'] = function readCounterFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  id3header?: TagHeader
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
  id3header?: TagHeader
): any {
  var charset = getTextEncoding(data.getByteAt(offset));

  return data.getStringWithCharsetAt(offset+1, length-1, charset).toString();
};

frameReaderFunctions['TXXX'] = function readTextFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  id3header?: TagHeader
): Object {
  var charset = getTextEncoding(data.getByteAt(offset));

  return getUserDefinedFields(offset, length, data, charset);
};

frameReaderFunctions['W*'] = function readUrlFrame(
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  id3header?: TagHeader
): any {
  // charset is only defined for user-defined URL link frames (http://id3.org/id3v2.3.0#User_defined_URL_link_frame)
  // for the other URL link frames it is always iso-8859-1
  var charset = getTextEncoding(data.getByteAt(offset));

  if (charset !== undefined) {
    return getUserDefinedFields(offset, length, data, charset);
  } else {
    return data.getStringWithCharsetAt(offset, length, charset).toString();
  }
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
  id3header?: TagHeader
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

// Handles reading description/data from either http://id3.org/id3v2.3.0#User_defined_text_information_frame
// and http://id3.org/id3v2.3.0#User_defined_URL_link_frame
function getUserDefinedFields(
  offset: number,
  length: number,
  data: MediaFileReader,
  charset: string
): Object {
  var userDesc = data.getStringWithCharsetAt(offset + 1, length - 1, charset);
  var userDefinedData = data.getStringWithCharsetAt(offset + 1 + userDesc.bytesReadCount, length - 1 - userDesc.bytesReadCount);

  return {
    user_description: userDesc.toString(),
    data: userDefinedData.toString()
  };
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
