var MediaTagReader = require('./MediaTagReader');

const FLAC_HEADER_SIZE = 4;



/**
 * Class representing a MediaTagReader that parses FLAC tags.
 */
class FLACTagReader extends MediaTagReader {
  _offset: number;

  /**
   * Gets the byte range for the tag identifier.
   *
   * Because the Vorbis comment block is not guaranteed to be in a specified
   * location, we can only load the first 4 bytes of the file to confirm it
   * is a FLAC first.
   *
   * @return {ByteRange} The byte range that identifies the tag for a FLAC.
   */
  static getTagIdentifierByteRange(): ByteRange {
    return {
      offset: 0,
      length: FLAC_HEADER_SIZE
    };
  }

  /**
   * Determines whether or not this reader can read a certain tag format.
   *
   * This checks that the first 4 characters in the file are fLaC, which
   * according to the FLAC file specification should be the characters that
   * indicate a FLAC file.
   *
   * @return {boolean} True if the header is fLaC, false otherwise.
   */
  static canReadTagFormat(tagIdentifier: Array<number>): boolean {
    var id = String.fromCharCode.apply(String, tagIdentifier.slice(0, 4));
    return id === 'fLaC';
  }

  _loadData(mediaFileReader: MediaFileReader, callbacks: LoadCallbackType) {
    var self = this;
    mediaFileReader.loadRange([4, 7], {
      onSuccess: function() {
        self._loadBlock(mediaFileReader, 4, callbacks);
      }
    });
  }

  /**
   * Special internal function used to identify the block that holds the Vorbis comment.
   *
   * The FLAC specification doesn't specify a specific location for metadata to resign, but
   * dictates that it may be in one of various blocks located throughout the file. To load the
   * metadata, we must locate the header first. This can be done by reading the first byte of
   * each block to determine the block type. After the block type comes a 24 bit integer that stores
   * the length of the block as big endian. Using this, we locate the block and store the offset for
   * parsing later.
   *
   * More info on the FLAC specification may be found here:
   * https://xiph.org/flac/format.html
   * @param {MediaFileReader} mediaFileReader - The MediaFileReader used to parse the file.
   * @param {number} offset - The offset to start checking the header from.
   * @param {LoadCallbackType} callbacks - The callback to call once the header has been found.
   */
  _loadBlock(
    mediaFileReader: MediaFileReader,
    offset: number,
    callbacks: LoadCallbackType
  ) {
    var self = this;
    var blockHeader = mediaFileReader.getByteAt(offset);
    var blockSize = mediaFileReader.getInteger24At(offset + 1, true);
    if (blockHeader !== 4 && blockHeader !== 132) {
      mediaFileReader.loadRange([offset + 4 + blockSize, offset + 3 + 4 + blockSize], {
        onSuccess: function() {
          self._loadBlock(mediaFileReader, offset + 4 + blockSize, callbacks);
        }
      });
    } else {
      var offsetMetadata = offset + 4;
      mediaFileReader.loadRange([offsetMetadata, offsetMetadata + blockSize], {
        onSuccess: function() {
          self._offset = offsetMetadata;
          callbacks.onSuccess();
        }
      });
    }
  }

  /**
   * Parses the data and returns the tags.
   * @param {MediaFileReader} data - The MediaFileReader to parse the file with.
   * @param {Array<string>} [tags] - Optional tags to also be retrieved from the file.
   * @return {TagType} - An object containing the tag information for the file.
   */
  _parseData(data: MediaFileReader, tags: ?Array<string>): TagType {
    var string = data.getLongAt(this._offset, false);
    var offsetVendor = this._offset + 4;
    var vendor = data.getStringWithCharsetAt(offsetVendor, string, "utf-8").toString();
    var offsetList = offsetVendor + string;
    var length = data.getLongAt(offsetList, false);
    var dataOffset = offsetList + 4;
    var title, artist, album, track, genre, picture;
    for (let i = 0; i < length; i++) {
      let dataLength = data.getLongAt(dataOffset, false);
      let s = data.getStringWithCharsetAt(dataOffset + 4, dataLength, "utf-8").toString();
      let d = s.indexOf("=");
      let split = [s.slice(0, d), s.slice(d + 1)];
      switch (split[0]) {
        case "TITLE":
          title = split[1]
        case "ARTIST":
          artist = split[1]
        case "ALBUM":
          album = split[1]
        case "TRACKNUMBER":
          track = split[1]
        case "GENRE":
          genre = split[1]
      }
      dataOffset += 4 + dataLength;
    }


    var tag = {
      type: "VorbisComment",
      version: "1",
      tags: {
        "title": title,
        "artist": artist,
        "album": album,
        "track": track,
        "genre": genre,
        "picture": picture
      }
    }
    return tag;
  }
}

module.exports = FLACTagReader;
