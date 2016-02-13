var xhr2Mock = jest.genMockFromModule('xhr2');

var _mockUrls = {};
function __setMockUrls(newMockUrls) {
  _mockUrls = {};

  for (var url in newMockUrls) {
    _mockUrls[url] = newMockUrls[url];
  }
};

function isRangeDisabled(url) {
  return !!(_mockUrls[url] || {}).disableRange;
}

function getUrlContents(url, range) {
  var urlData = _mockUrls[url];

  if (urlData == null) {
    return null;
  }

  if (urlData.disableRange) {
    range = null;
  }

  var contents;
  if (typeof urlData === 'string') {
    contents = urlData;
  } else {
    contents = urlData.contents;
  }

  return range ? contents.slice(range[0], range[1] + 1) : contents;
}

function getUrlFileLength(url) {
  var urlData = _mockUrls[url];

  if (urlData == null || urlData.unknownLength) {
    return null;
  }

  return getUrlContents(url).length;
}

function isHeaderDisallowed(url, header) {
  var urlData = _mockUrls[url];
  return (
    urlData != null &&
    (urlData.disallowedHeaders||[]).indexOf(header) >= 0
  );
}

function getUrlContentLength(url, range) {
  if (isHeaderDisallowed(url, 'content-length')) {
    return null;
  }

  return getUrlContents(url, range).length;
}

function getUrlStatusCode(url) {
  var urlData = _mockUrls[url];

  if (urlData == null) {
    return 404;
  } else {
    return urlData.statusCode || 200;
  }
}

function XMLHttpRequestMock() {
  var _url;
  var _range;

  this.onload = function() {};
  this.open = jest.genMockFunction().mockImplementation(function(method, url) {
    _url = url;
    _range = null;
  });
  this.overrideMimeType = jest.genMockFunction();
  this.setRequestHeader = jest.genMockFunction().mockImplementation(
    function(headerName, headerValue) {
      if (headerName.toLowerCase() === "range") {
        var matches = headerValue.match(/bytes=(\d+)-(\d+)/);
        _range = [Number(matches[1]), Number(matches[2])];
      }
    }
  );
  this.getResponseHeader = jest.genMockFunction().mockImplementation(
    function(headerName) {
      if (headerName.toLowerCase() === "content-length") {
        return getUrlContentLength(_url, _range);
      } else if (headerName.toLowerCase() === "content-range") {
        return this._getContentRange();
      }
    }
  );
  this._getContentRange = function() {
    if (_range && !isRangeDisabled(_url) && !isHeaderDisallowed('content-range')) {
      var endByte = Math.min(_range[1], getUrlContents(_url).length - 1);
      return "bytes " + _range[0] + "-" + endByte + "/" + (getUrlFileLength(_url) || "*");
    }
  }
  this.getAllResponseHeaders = jest.genMockFunction().mockImplementation(
    function() {
      var headers = [];

      headers.push("content-length: " + getUrlContentLength(_url, _range));
      if (this._getContentRange()) {
        headers.push("content-range: " + this._getContentRange());
      }

      return headers.join("\r\n");
    }
  );
  this.send = jest.genMockFunction().mockImplementation(function() {
    process.nextTick(function() {
      this.status = getUrlStatusCode(_url);
      this.responseText = getUrlContents(_url, _range);
      this.onload();
    }.bind(this));
  });
}

var XMLHttpRequest = new XMLHttpRequestMock();
xhr2Mock.__setMockUrls = __setMockUrls;
xhr2Mock.XMLHttpRequest = XMLHttpRequest;
window.XMLHttpRequest = function() { return XMLHttpRequest; };

module.exports = xhr2Mock;
