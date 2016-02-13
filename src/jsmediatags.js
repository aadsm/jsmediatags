/**
 * @flow
 */
'use strict';

const MediaFileReader = require("./MediaFileReader");
const NodeFileReader = require("./NodeFileReader");
const XhrFileReader = require("./XhrFileReader");
const BlobFileReader = require("./BlobFileReader");
const MediaTagReader = require("./MediaTagReader");
const ID3v1TagReader = require("./ID3v1TagReader");
const ID3v2TagReader = require("./ID3v2TagReader");
const MP4TagReader = require("./MP4TagReader");

import type {
  CallbackType,
  LoadCallbackType
} from './FlowTypes';

var mediaFileReaders: Array<Class<MediaFileReader>> = [];
var mediaTagReaders: Array<Class<MediaTagReader>> = [];

function read(location: Object, callbacks: CallbackType) {
  new Reader(location).read(callbacks);
}

class Reader {
  _file: any;
  _tagsToRead: Array<string>;
  _fileReader: Class<MediaFileReader>;
  _tagReader: Class<MediaTagReader>;

  constructor(file: any) {
    this._file = file;
  }

  setTagsToRead(tagsToRead: Array<string>): Reader {
    this._tagsToRead = tagsToRead;
    return this;
  }

  setFileReader(fileReader: Class<MediaFileReader>): Reader {
    this._fileReader = fileReader;
    return this;
  }

  setTagReader(tagReader: Class<MediaTagReader>): Reader {
    this._tagReader = tagReader;
    return this;
  }

  read(callbacks: CallbackType) {
    var FileReader = this._getFileReader();
    var fileReader = new FileReader(this._file);
    var self = this;

    fileReader.init({
      onSuccess: function() {
        self._getTagReader(fileReader, {
          onSuccess: function(TagReader: Class<MediaTagReader>) {
            new TagReader(fileReader)
              .setTagsToRead(self._tagsToRead)
              .read(callbacks);
          },
          onError: callbacks.onError
        });
      },
      onError: callbacks.onError
    });
  }

  _getFileReader(): Class<MediaFileReader> {
    if (this._fileReader) {
      return this._fileReader;
    } else {
      return this._findFileReader();
    }
  }

  _findFileReader(): Class<MediaFileReader> {
    for (var i = 0; i < mediaFileReaders.length; i++) {
      if (mediaFileReaders[i].canReadFile(this._file)) {
        return mediaFileReaders[i];
      }
    }

    throw new Error("No suitable file reader found for ", this._file);
  }

  _getTagReader(fileReader: MediaFileReader, callbacks: CallbackType) {
    if (this._tagReader) {
      var tagReader = this._tagReader;
      setTimeout(function() {
        callbacks.onSuccess(tagReader);
      }, 1);
    } else {
      this._findTagReader(fileReader, callbacks);
    }
  }

  _findTagReader(fileReader: MediaFileReader, callbacks: CallbackType) {
    // We don't want to make multiple fetches per tag reader to get the tag
    // identifier. The strategy here is to combine all the tag identifier
    // ranges into one and make a single fetch. This is particularly important
    // in file readers that have expensive loads like the XHR one.
    // However, with this strategy we run into the problem of loading the
    // entire file because tag identifiers might be at the start or end of
    // the file.
    // To get around this we divide the tag readers into two categories, the
    // ones that read their tag identifiers from the start of the file and the
    // ones that read from the end of the file.
    var tagReadersAtFileStart = [];
    var tagReadersAtFileEnd = [];
    var fileSize = fileReader.getSize();

    for (var i = 0; i < mediaTagReaders.length; i++) {
      var range = mediaTagReaders[i].getTagIdentifierByteRange();
      if (
        (range.offset >= 0 && range.offset < fileSize / 2) ||
        (range.offset < 0 && range.offset < -fileSize / 2)
      ) {
        tagReadersAtFileStart.push(mediaTagReaders[i]);
      } else {
        tagReadersAtFileEnd.push(mediaTagReaders[i]);
      }
    }

    var tagsLoaded = false;
    var loadTagIdentifiersCallbacks = {
      onSuccess: function() {
        if (!tagsLoaded) {
          // We're expecting to load two sets of tag identifiers. This flag
          // indicates when the first one has been loaded.
          tagsLoaded = true;
          return;
        }

        for (var i = 0; i < mediaTagReaders.length; i++) {
          var range = mediaTagReaders[i].getTagIdentifierByteRange();
          var tagIndentifier = fileReader.getBytesAt(
            range.offset >= 0 ? range.offset : range.offset + fileSize,
            range.length
          );

          if (mediaTagReaders[i].canReadTagFormat(tagIndentifier)) {
            callbacks.onSuccess(mediaTagReaders[i]);
            return;
          }
        }

        if (callbacks.onError) {
          callbacks.onError({
            "type": "tagFormat",
            "info": "No suitable tag reader found"
          });
        }
      },
      onError: callbacks.onError
    };

    this._loadTagIdentifierRanges(fileReader, tagReadersAtFileStart, loadTagIdentifiersCallbacks);
    this._loadTagIdentifierRanges(fileReader, tagReadersAtFileEnd, loadTagIdentifiersCallbacks);
  }

  _loadTagIdentifierRanges(
    fileReader: MediaFileReader,
    tagReaders: Array<Class<MediaTagReader>>,
    callbacks: LoadCallbackType
  ) {
    if (tagReaders.length === 0) {
      // Force async
      setTimeout(callbacks.onSuccess, 1);
      return;
    }

    var tagIdentifierRange = [Number.MAX_VALUE, 0];
    var fileSize = fileReader.getSize();

    // Create a super set of all ranges so we can load them all at once.
    // Might need to rethink this approach if there are tag ranges too far
    // a part from each other. We're good for now though.
    for (var i = 0; i < tagReaders.length; i++) {
      var range = tagReaders[i].getTagIdentifierByteRange();
      var start = range.offset >= 0 ? range.offset : range.offset + fileSize;
      var end = start + range.length - 1;

      tagIdentifierRange[0] = Math.min(start, tagIdentifierRange[0]);
      tagIdentifierRange[1] = Math.max(end, tagIdentifierRange[1]);
    }

    fileReader.loadRange(tagIdentifierRange, callbacks);
  }
}

class Config {
  static addFileReader(fileReader: Class<MediaFileReader>): Class<Config> {
    mediaFileReaders.push(fileReader);
    return this;
  }

  static addTagReader(tagReader: Class<MediaTagReader>): Class<Config> {
    mediaTagReaders.push(tagReader);
    return this;
  }

  static removeTagReader(tagReader: Class<MediaTagReader>): Class<Config> {
    var tagReaderIx = mediaTagReaders.indexOf(tagReader);

    if (tagReaderIx >= 0) {
      mediaTagReaders.splice(tagReaderIx, 1);
    }

    return this;
  }

  static EXPERIMENTAL_avoidHeadRequests() {
    XhrFileReader.setConfig({
      avoidHeadRequests: true
    });
  }

  static setDisallowedXhrHeaders(disallowedXhrHeaders: Array<string>) {
    XhrFileReader.setConfig({
      disallowedXhrHeaders: disallowedXhrHeaders
    });
  }
}

Config
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addFileReader(XhrFileReader)
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addFileReader(BlobFileReader)
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addTagReader(ID3v2TagReader)
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addTagReader(ID3v1TagReader)
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addTagReader(MP4TagReader);

if (typeof process !== "undefined") {
  Config
    // $FlowIssue - flow doesn't allow type to pass as their supertype
    .addFileReader(NodeFileReader);
}

module.exports = {
  "read": read,
  "Reader": Reader,
  "Config": Config
};
