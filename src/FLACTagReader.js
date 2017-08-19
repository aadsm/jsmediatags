var MediaTagReader = require('./MediaTagReader');

/* The first 4 bytes of a FLAC file describes the header for the file. If these
 * bytes respectively read "fLaC", we can determine it is a FLAC file.
 */
const FLAC_HEADER_SIZE = 4;

/* FLAC metadata is stored in blocks containing data ranging from STREAMINFO to
 * VORBIS_COMMENT, which is what we want to work with.
 *
 * Each metadata header is 4 bytes long, with the first byte determining whether
 * it is the last metadata block before the audio data and what the block type is.
 * This first byte can further be split into 8 bits, with the first bit being the
 * last-metadata-block flag, and the last three bits being the block type.
 *
 * Since the specification states that the decimal value for a VORBIS_COMMENT block
 * type is 4, the two possibilities for the comment block header values are:
 * - 00000100 (Not a last metadata comment block, value of 4)
 * - 10000100 (A last metadata comment block, value of 132)
 *
 * All values for METADATA_BLOCK_HEADER can be found here.
 * https://xiph.org/flac/format.html#metadata_block_header
 */
const COMMENT_HEADERS = [4, 132];


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

  /**
   * Function called to load the data from the file.
   *
   * To begin processing the blocks, the next 4 bytes after the initial 4 bytes
   * (bytes 4 through 7) are loaded. From there, the rest of the loading process
   * is passed on to the _loadBlock function, which will handle the rest of the
   * parsing for the metadata blocks.
   *
   * @param {MediaFileReader} mediaFileReader - The MediaFileReader used to parse the file.
   * @param {LoadCallbackType} callbacks - The callback to call once _loadData is completed.
   */
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
    /* As mentioned above, this first byte is loaded to see what metadata type
     * this block represents.
     */
    var blockHeader = mediaFileReader.getByteAt(offset);
    /* The last three bytes (integer 24) contain a value representing the length
     * of the following metadata block. The 1 is added in order to shift the offset
     * by one to get the last three bytes in the block header.
     */
    var blockSize = mediaFileReader.getInteger24At(offset + 1, true);
    /* This conditional checks if blockHeader (the byte retrieved representing the
     * type of the header) is not the header we are looking for.
     *
     * If that is not true, the block is skipped over and the next range is loaded:
     * - offset + 4 + blockSize adds 4 to skip over the initial metadata header and
     * blockSize to skip over the block overall, placing it at the head of the next
     * metadata header.
     * - offset + 4 + 4 + blockSize does the same thing as the previous block with
     * the exception of adding another 4 bytes to move it to the end of the new metadata
     * header.
     */
    if (COMMENT_HEADERS.indexOf(blockHeader) === -1) {
      mediaFileReader.loadRange([offset + 4 + blockSize, offset + 4 + 4 + blockSize], {
        onSuccess: function() {
          self._loadBlock(mediaFileReader, offset + 4 + blockSize, callbacks);
        }
      });
    } else {
      /* 4 is added to offset to move it to the head of the actual metadata.
       * The range starting from offsetMatadata (the beginning of the block)
       * and offsetMetadata + blockSize (the end of the block) is loaded.
       */
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
   *
   * This is an overview of the VorbisComment format and what this function attempts to
   * retrieve:
   * - First 4 bytes: a long that contains the length of the vendor string.
   * - Next n bytes: the vendor string encoded in UTF-8.
   * - Next 4 bytes: a long representing how many comments are in this block
   * For each comment that exists:
   * - First 4 bytes: a long representing the length of the comment
   * - Next n bytes: the comment encoded in UTF-8.
   * The comment string will usually appear in a format similar to:
   * ARTIST=me
   *
   * Note that the longs and integers in this block are encoded in little endian
   * as opposed to big endian for the rest of the FLAC spec.
   * @param {MediaFileReader} data - The MediaFileReader to parse the file with.
   * @param {Array<string>} [tags] - Optional tags to also be retrieved from the file.
   * @return {TagType} - An object containing the tag information for the file.
   */
  _parseData(data: MediaFileReader, tags: ?Array<string>): TagType {
    var vendorLength = data.getLongAt(this._offset, false);
    var offsetVendor = this._offset + 4;
    /* This line is able to retrieve the vendor string that the VorbisComment block
     * contains. However, it is not part of the tags that JSMediaTags normally retrieves,
     * and is therefore commented out.
     */
    // var vendor = data.getStringWithCharsetAt(offsetVendor, vendorLength, "utf-8").toString();
    var offsetList = vendorLength + offsetVendor;
    /* To get the metadata from the block, we first get the long that contains the
     * number of actual comment values that are existent within the block.
     *
     * As we loop through all of the comment blocks, we get the data length in order to
     * get the right size string, and then determine which category that string falls under.
     * The dataOffset variable is constantly updated so that it is at the beginning of the
     * comment that is currently being parsed.
     *
     * Additions of 4 here are used to move the offset past the first 4 bytes which only contain
     * the length of the comment.
     */
    var numComments = data.getLongAt(offsetList, false);
    var dataOffset = offsetList + 4;
    var title, artist, album, track, genre, picture;
    for (let i = 0; i < numComments; i++) {
      let dataLength = data.getLongAt(dataOffset, false);
      let s = data.getStringWithCharsetAt(dataOffset + 4, dataLength, "utf-8").toString();
      let d = s.indexOf("=");
      let split = [s.slice(0, d), s.slice(d + 1)];
      switch (split[0]) {
        case "TITLE":
          title = split[1];
          break;
        case "ARTIST":
          artist = split[1];
          break;
        case "ALBUM":
          album = split[1];
          break;
        case "TRACKNUMBER":
          track = split[1];
          break;
        case "GENRE":
          genre = split[1];
          break;
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
