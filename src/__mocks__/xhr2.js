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

function getUrlContentLength(url, range) {
  var urlData = _mockUrls[url];

  if (urlData == null || urlData.unknownLength) {
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
        _range = [matches[1], matches[2]];
      }
    }
  );
  this.getResponseHeader = jest.genMockFunction().mockImplementation(
    function(headerName) {
      if (headerName.toLowerCase() === "content-length") {
        return getUrlContentLength(_url, _range);
      } else if (headerName.toLowerCase() === "content-range" && _range && !isRangeDisabled(_url)) {
        var endByte = Math.min(_range[1], getUrlContents(_url).length - 1);
        return "bytes " + _range[0] + "-" + endByte + "/" + (getUrlContentLength(_url, _range) || "*");
      }
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
