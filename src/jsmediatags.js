/**
 * @flow
 */
'use strict';

const MediaFileReader = require("./MediaFileReader");
const NodeFileReader = require("./NodeFileReader");
const XhrFileReader = require("./XhrFileReader");
const BlobFileReader = require("./BlobFileReader");
const MediaTagReader = require("./MediaTagReader");
const ID3v2TagReader = require("./ID3v2TagReader");

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
  _tags: Array<string>;
  _fileReader: Class<MediaFileReader>;
  _tagReader: Class<MediaTagReader>;

  constructor(file: any) {
    this._file = file;
  }

  setTags(tags: Array<string>): Reader {
    this._tags = tags;
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
              .setTags(self._tags)
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
    var tagIdentifierRange = [Number.MAX_VALUE, 0];

    // Create a super set of all ranges so we can load them all at once.
    // Might need to rethink this approach if there are tag ranges too far
    // a part from each other. We're good for now though.
    for (var i = 0; i < mediaTagReaders.length; i++) {
      var range = mediaTagReaders[i].getTagIdentifierByteRange();

      if (range[1] < range[0]) {
        throw new Error("Invalid range: ", range, " from ", mediaTagReaders[i]);
      }

      tagIdentifierRange[0] = Math.min(range[0], tagIdentifierRange[0]);
      tagIdentifierRange[1] = Math.max(range[1], tagIdentifierRange[1]);
    }

    fileReader.loadRange(tagIdentifierRange, {
      onSuccess: function() {
        for (var i = 0; i < mediaTagReaders.length; i++) {
          var range = mediaTagReaders[i].getTagIdentifierByteRange();
          var tagIndentifier = fileReader.getBytesAt(
            range[0],
            range[1] - range[0] + 1
          );
          if (mediaTagReaders[i].canReadTagFormat(tagIndentifier)) {
            callbacks.onSuccess(mediaTagReaders[i]);
            return;
          }
        }
      },
      onError: callbacks.onError
    });
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
}

Config
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addFileReader(XhrFileReader)
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addFileReader(BlobFileReader)
  // $FlowIssue - flow doesn't allow type to pass as their supertype
  .addTagReader(ID3v2TagReader);

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
