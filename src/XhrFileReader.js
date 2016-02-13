/**
 * @flow
 */
'use strict';

const ChunkedFileData = require('./ChunkedFileData');
const MediaFileReader = require('./MediaFileReader');

const CHUNK_SIZE = 1024;

import type {
  LoadCallbackType,
  CallbackType
} from './FlowTypes';

type ContentRangeType = {
  firstBytePosition: ?number,
  lastBytePosition: ?number,
  instanceLength: ?number,
};

class XhrFileReader extends MediaFileReader {
  static _config: {
    avoidHeadRequests: boolean,
    disallowedXhrHeaders: Array<string>,
  };
  _url: string;
  // $FlowIssue - Flow gets confused with module.exports
  _fileData: ChunkedFileData;

  constructor(url: string) {
    super();
    this._url = url;
    // $FlowIssue - Constructor cannot be called on exports
    this._fileData = new ChunkedFileData();
  }

  static canReadFile(file: any): boolean {
    return (
      typeof file === 'string' &&
      /^[a-z]+:\/\//i.test(file)
    );
  }

  static setConfig(config: Object) {
    for (var key in config) if (config.hasOwnProperty(key)) {
      this._config[key] = config[key];
    }

    var disallowedXhrHeaders = this._config.disallowedXhrHeaders;
    for (var i = 0; i < disallowedXhrHeaders.length; i++) {
      disallowedXhrHeaders[i] = disallowedXhrHeaders[i].toLowerCase();
    }
  }

  _init(callbacks: LoadCallbackType): void {
    if (XhrFileReader._config.avoidHeadRequests) {
      this._fetchSizeWithGetRequest(callbacks);
    } else {
      this._fetchSizeWithHeadRequest(callbacks);
    }
  }

  _fetchSizeWithHeadRequest(callbacks: LoadCallbackType): void {
    var self = this;

    this._makeXHRRequest("HEAD", null, {
      onSuccess: function(xhr: XMLHttpRequest) {
        var contentLength = self._parseContentLength(xhr);
        if (contentLength) {
          self._size = contentLength;
          callbacks.onSuccess();
        } else {
          // Content-Length not provided by the server, fallback to
          // GET requests.
          self._fetchSizeWithGetRequest(callbacks);
        }
      },
      onError: callbacks.onError
    });
  }

  _fetchSizeWithGetRequest(callbacks: LoadCallbackType): void {
    var self = this;
    var range = this._roundRangeToChunkMultiple([0, 0]);

    this._makeXHRRequest("GET", range, {
      onSuccess: function(xhr: XMLHttpRequest) {
        var contentRange = self._parseContentRange(xhr);
        var data = self._getXhrResponseContent(xhr);

        if (contentRange) {
          if (contentRange.instanceLength == null) {
            // Last resort, server is not able to tell us the content length,
            // need to fetch entire file then.
            self._fetchEntireFile(callbacks);
            return;
          }
          self._size = contentRange.instanceLength;
        } else {
          // Range request not supported, we got the entire file
          self._size = data.length;
        }

        self._fileData.addData(0, data);
        callbacks.onSuccess();
      },
      onError: callbacks.onError
    });
  }

  _fetchEntireFile(callbacks: LoadCallbackType): void {
    var self = this;
    this._makeXHRRequest("GET", null, {
      onSuccess: function(xhr: XMLHttpRequest) {
        var data = self._getXhrResponseContent(xhr);
        self._size = data.length;
        self._fileData.addData(0, data);
        callbacks.onSuccess();
      },
      onError: callbacks.onError
    });
  }

  _getXhrResponseContent(xhr: XMLHttpRequest): string {
    return xhr.responseBody || xhr.responseText || "";
  }

  _parseContentLength(xhr: XMLHttpRequest): ?number {
    var contentLength = this._getResponseHeader(xhr, "Content-Length");

    if (contentLength == null) {
      return contentLength;
    } else {
      return parseInt(contentLength, 10);
    }
  }

  _parseContentRange(xhr: XMLHttpRequest): ?ContentRangeType {
    var contentRange = this._getResponseHeader(xhr, "Content-Range");

    if (contentRange) {
      var parsedContentRange = contentRange.match(
        /bytes (\d+)-(\d+)\/(?:(\d+)|\*)/i
      );
      if (!parsedContentRange) {
        throw new Error("FIXME: Unknown Content-Range syntax: ", contentRange);
      }

      return {
        firstBytePosition: parseInt(parsedContentRange[1], 10),
        lastBytePosition: parseInt(parsedContentRange[2], 10),
        instanceLength: parsedContentRange[3] ? parseInt(parsedContentRange[3], 10) : null
      };
    } else {
      return null;
    }
  }

  loadRange(range: [number, number], callbacks: LoadCallbackType): void {
    var self = this;

    if (self._fileData.hasDataRange(range[0], range[1])) {
      setTimeout(callbacks.onSuccess, 1);
      return;
    }

    // Always download in multiples of CHUNK_SIZE. If we're going to make a
    // request might as well get a chunk that makes sense. The big cost is
    // establishing the connection so getting 10bytes or 1K doesn't really
    // make a difference.
    range = this._roundRangeToChunkMultiple(range);

    this._makeXHRRequest("GET", range, {
      onSuccess: function(xhr: XMLHttpRequest) {
        var data = self._getXhrResponseContent(xhr);
        self._fileData.addData(range[0], data);
        callbacks.onSuccess();
      },
      onError: callbacks.onError
    });
  }

  _roundRangeToChunkMultiple(range: [number, number]): [number, number] {
    var length = range[1] - range[0] + 1;
    var newLength = Math.ceil(length/CHUNK_SIZE) * CHUNK_SIZE;
    return [range[0], range[0] + newLength - 1];
  }

  _makeXHRRequest(
    method: string,
    range: ?[number, number],
    callbacks: CallbackType
  ) {
    var xhr = this._createXHRObject();

    var onXHRLoad = function() {
      // 200 - OK
      // 206 - Partial Content
      if (xhr.status === 200 || xhr.status === 206) {
        callbacks.onSuccess(xhr);
      } else if (callbacks.onError) {
        callbacks.onError({
          "type": "xhr",
          // $FlowIssue - xhr will not be null here
          "info": "Unexpected HTTP status " + xhr.status + ".",
          "xhr": xhr
        });
      }
      xhr = null;
    };

    if (typeof xhr.onload !== 'undefined') {
      xhr.onload = onXHRLoad;
      xhr.onerror = function() {
        if (callbacks.onError) {
          callbacks.onError({
            "type": "xhr",
            "info": "Generic XHR error, check xhr object.",
            "xhr": xhr,
          });
        }
      }
    } else {
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          onXHRLoad();
        }
      };
    }

    xhr.open(method, this._url);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    if (range) {
      this._setRequestHeader(xhr, "Range", "bytes=" + range[0] + "-" + range[1]);
    }
    this._setRequestHeader(xhr, "If-Modified-Since", "Sat, 01 Jan 1970 00:00:00 GMT");
    xhr.send(null);
  }

  _setRequestHeader(xhr: XMLHttpRequest, headerName: string, headerValue: string) {
    if (XhrFileReader._config.disallowedXhrHeaders.indexOf(headerName.toLowerCase()) < 0) {
      xhr.setRequestHeader(headerName, headerValue);
    }
  }

  _hasResponseHeader(xhr: XMLHttpRequest, headerName: string): boolean {
    var allResponseHeaders = xhr.getAllResponseHeaders();

    if (!allResponseHeaders) {
      return false;
    }

    var headers = allResponseHeaders.split("\r\n");
    var headerNames = [];
    for (var i = 0; i < headers.length; i++) {
      headerNames[i] = headers[i].split(":")[0].toLowerCase();
    }

    return headerNames.indexOf(headerName.toLowerCase()) >= 0;
  }

  _getResponseHeader(xhr: XMLHttpRequest, headerName: string): ?string {
    if (!this._hasResponseHeader(xhr, headerName)) {
      return null;
    }

    return xhr.getResponseHeader(headerName);
  }

  getByteAt(offset: number): number {
    var character = this._fileData.getByteAt(offset);
    return character.charCodeAt(0) & 0xff;
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

XhrFileReader._config = {
  avoidHeadRequests: false,
  disallowedXhrHeaders: [],
};

module.exports = XhrFileReader;
