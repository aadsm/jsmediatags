/**
 * @flow
 */
'use strict';

var MediaTagReader = require('./MediaTagReader');
var MediaFileReader = require('./MediaFileReader');

import type {
  LoadCallbackType,
  ByteRange,
  TagType
} from './FlowTypes';

class ID3v1TagReader extends MediaTagReader {
  static getTagIdentifierByteRange(): ByteRange {
    // The identifier is TAG and is at offset: -128. However, to avoid a
    // fetch for the tag identifier and another for the data, we load the
    // entire data since it's so small.
    return {
      offset: -128,
      length: 128
    };
  }

  static canReadTagFormat(tagIdentifier: Array<number>): boolean {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(0, 3));
    return id === "TAG";
  }

  _loadData(mediaFileReader: MediaFileReader, callbacks: LoadCallbackType) {
    var fileSize = mediaFileReader.getSize();
    mediaFileReader.loadRange([fileSize - 128, fileSize - 1], callbacks);
  }

  _parseData(data: MediaFileReader, tags: ?Array<string>): TagType {
    var offset = data.getSize() - 128;

    var title = data.getStringWithCharsetAt(offset + 3, 30).toString();
    var artist = data.getStringWithCharsetAt(offset + 33, 30).toString();
    var album = data.getStringWithCharsetAt(offset + 63, 30).toString();
    var year = data.getStringWithCharsetAt(offset + 93, 4).toString();

    var trackFlag = data.getByteAt(offset + 97 + 28);
    var track = data.getByteAt(offset + 97 + 29);
    if (trackFlag == 0 && track != 0) {
      var version = "1.1";
      var comment = data.getStringWithCharsetAt(offset + 97, 28).toString();
    } else {
      var version = "1.0";
      var comment = data.getStringWithCharsetAt(offset + 97, 30).toString();
      track = 0;
    }

    var genreIdx = data.getByteAt(offset + 97 + 30);
    if (genreIdx < 255) {
      var genre = GENRES[genreIdx];
    } else {
      var genre = "";
    }

    var tag = {
      "type": "ID3",
      "version" : version,
      "tags": {
        "title" : title,
        "artist" : artist,
        "album" : album,
        "year" : year,
        "comment" : comment,
        "genre" : genre
      }
    };

    if (track) {
      // $FlowIssue - flow is not happy with adding properties
      tag.tags.track = track;
    }

    return tag;
  }
}

var GENRES = [
  "Blues","Classic Rock","Country","Dance","Disco","Funk","Grunge",
  "Hip-Hop","Jazz","Metal","New Age","Oldies","Other","Pop","R&B",
  "Rap","Reggae","Rock","Techno","Industrial","Alternative","Ska",
  "Death Metal","Pranks","Soundtrack","Euro-Techno","Ambient",
  "Trip-Hop","Vocal","Jazz+Funk","Fusion","Trance","Classical",
  "Instrumental","Acid","House","Game","Sound Clip","Gospel",
  "Noise","AlternRock","Bass","Soul","Punk","Space","Meditative",
  "Instrumental Pop","Instrumental Rock","Ethnic","Gothic",
  "Darkwave","Techno-Industrial","Electronic","Pop-Folk",
  "Eurodance","Dream","Southern Rock","Comedy","Cult","Gangsta",
  "Top 40","Christian Rap","Pop/Funk","Jungle","Native American",
  "Cabaret","New Wave","Psychadelic","Rave","Showtunes","Trailer",
  "Lo-Fi","Tribal","Acid Punk","Acid Jazz","Polka","Retro",
  "Musical","Rock & Roll","Hard Rock","Folk","Folk-Rock",
  "National Folk","Swing","Fast Fusion","Bebob","Latin","Revival",
  "Celtic","Bluegrass","Avantgarde","Gothic Rock","Progressive Rock",
  "Psychedelic Rock","Symphonic Rock","Slow Rock","Big Band",
  "Chorus","Easy Listening","Acoustic","Humour","Speech","Chanson",
  "Opera","Chamber Music","Sonata","Symphony","Booty Bass","Primus",
  "Porn Groove","Satire","Slow Jam","Club","Tango","Samba",
  "Folklore","Ballad","Power Ballad","Rhythmic Soul","Freestyle",
  "Duet","Punk Rock","Drum Solo","Acapella","Euro-House","Dance Hall"
];

module.exports = ID3v1TagReader;
