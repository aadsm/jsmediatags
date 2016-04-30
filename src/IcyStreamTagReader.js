/**
 * @flow
 */
'use strict';

const MediaStreamTagReader = require('./MediaStreamTagReader');

import type {
  StreamCallbackType
} from './FlowTypes';

const TAG_SIZE_MULTIPLIER = 16;
const MAX_XHR_BUFFER = 1024 * 1024 * 5; // 5MB

/**
 * Tag protocol for Icy can be found here: http://www.smackfu.com/stuff/programming/shoutcast.html
 */
class IcyStreamTagReader extends MediaStreamTagReader {
  _xhr: ?XMLHttpRequest;
  _nextTagOffset: number;
  _lastTag: string;
  _icyMetaInt: number;

  read(callbacks: StreamCallbackType) {
    var self = this;
    this._readStream({
      onUpdate: function(event) {
        self.readTag(event.target._responseParts, callbacks);
        if (event.loaded > MAX_XHR_BUFFER) {
          // The connection is restarted to avoid accumulating too much data
          // in the same XHR object.
          self._stopStream();
          self.read(callbacks);
        }
      },
      onError: callbacks.onError
    });
  }

  _stopStream() {
    if (this._xhr) {
      this._xhr.abort();
      this._xhr = null;
    }
  }

  _readStream(callbacks: StreamCallbackType) {
    var self = this;
    var xhr = this._xhr = this._createXHRObject();
    var isInitialized = false;

    if (typeof xhr.onprogress === 'undefined') {
      if (callbacks.onError) {
        callbacks.onError({
          "type": "xhr",
          "info": "onprogress not supported.",
          "xhr": xhr
        });
      }
      return;
    }

    xhr.onprogress = function(event) {
      if (!isInitialized) {
        isInitialized = true;
        self.init(self._getResponseHeaders(xhr));
      }
      callbacks.onUpdate(event);
    };

    xhr.open("GET", this._url);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader("Icy-MetaData", "1");
    xhr.send(null);
  }

  init(metadata: {[name: string]: any}) {
    this._icyMetaInt = metadata["icy-metaint"]
    // icyMetaInt is the number of bytes needed to be read before the
    // metadata.
    this._nextTagOffset = this._icyMetaInt;
  }

  readTag(dataParts: Array<Array<number>>, callbacks: StreamCallbackType) {
    var length = 0;

    for (var data of dataParts) {
      length += data.length;
      if (length-1 < this._nextTagOffset) {
        continue;
      }

      var dataOffset = this._nextTagOffset - (length - data.length);
      var byteArray = new Uint8Array(data);
      var tagSize = byteArray[dataOffset] * TAG_SIZE_MULTIPLIER;

      if (tagSize > 0) {
        var tagContent = "";
        for (var i = dataOffset+1, j = 0; j < tagSize; i++, j++) {
          if (!byteArray[i]) {
            break;
          }
          tagContent += String.fromCharCode(byteArray[i]);
        }

        var tagContentParts = tagContent.match(/^StreamTitle='(.*)';$/i);
        if (tagContentParts) {
          var tag = tagContentParts[1];
          if (tag !== this._lastTag) {
            this._lastTag = tag;
            callbacks.onUpdate(tag);
          }
        }
      }

      this._nextTagOffset += tagSize+1 + this._icyMetaInt;
    }
  }

  _getResponseHeaders(xhr: XMLHttpRequest): {[name: string]: string} {
    var allResponseHeaders = xhr.getAllResponseHeaders();
    var responseHeaders = {};

    if (!allResponseHeaders) {
      return responseHeaders;
    }

    var headers = allResponseHeaders.split("\r\n");
    var headerNames = [];
    for (var i = 0; i < headers.length; i++) {
      var namesAndValues = headers[i].split(":");
      responseHeaders[namesAndValues[0].toLowerCase()] = namesAndValues[1];
    }

    return responseHeaders;
  }

  _createXHRObject(): XMLHttpRequest {
    if (typeof window === "undefined") {
      // $FlowIssue - flow is not able to recognize this module.
      return new (require("xhr2").XMLHttpRequest)();
    }

    if (window.XMLHttpRequest) {
      return new window.XMLHttpRequest();
    }

    throw new Error("XMLHttpRequest is not supported");
  }
}

module.exports = IcyStreamTagReader;
