var xhr2Mock = jest.genMockFromModule('xhr2');

var _mockUrls = {};
function __setMockUrls(newMockUrls) {
  _mockUrls = {};

  for (var url in newMockUrls) {
    _mockUrls[url] = newMockUrls[url];
  }
};

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
        if (_range) {
          return _range[1] - _range[0] + 1;
        } else {
          return _mockUrls[_url].length;
        }
      }
    }
  );
  this.send = jest.genMockFunction().mockImplementation(function() {
    process.nextTick(function() {
      this.status = _url in _mockUrls ? 200 : 404;
      this.responseText = _mockUrls[_url];
      this.onload();
    }.bind(this));
  });
}

var XMLHttpRequest = new XMLHttpRequestMock();
xhr2Mock.__setMockUrls = __setMockUrls;
xhr2Mock.XMLHttpRequest = XMLHttpRequest;
window.XMLHttpRequest = function() { return XMLHttpRequest; };

module.exports = xhr2Mock;
