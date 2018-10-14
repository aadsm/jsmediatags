jest
  .mock('xhr2')
  .dontMock('../XhrFileReader.js')
  .dontMock('../MediaFileReader.js')
  .dontMock('../ChunkedFileData.js');

var XhrFileReader = require('../XhrFileReader');

function throwOnError(onSuccess) {
  return {
    onSuccess: onSuccess,
    onError: function() {
      throw new Error();
    }
  }
}

function throwOnSuccess(onError) {
  return {
    onSuccess: function() {
      throw new Error();
    },
    onError: onError
  }
}

describe("XhrFileReader", function() {
  var fileReader;

  beforeEach(function() {
    jest.resetModules();
    require('xhr2').__setMockUrls({
      "http://www.example.fakedomain/music.mp3": "This is a simple file",
      "http://www.example.fakedomain/big-file.mp3": new Array(100).join("This is a simple file"),
      "http://www.example.fakedomain/range-not-supported.mp3": {
        contents: new Array(100).join("This is a simple file"),
        disableRange: true
      },
      "http://www.example.fakedomain/range-supported.mp3": {
        contents: new Array(100).join("This is a simple file"),
      },
      "http://www.example.fakedomain/unknown-length.mp3": {
        contents: new Array(100).join("This is a simple file"),
        unknownLength: true
      },
      "http://www.example.fakedomain/timeout": {
        contents: "This is a simple file",
        timeout: 500
      },
    });
    XhrFileReader.setConfig({
      avoidHeadRequests: false,
      disallowedXhrHeaders: [],
      timeoutInSec: 30,
    });
    fileReader = new XhrFileReader("http://www.example.fakedomain/music.mp3");
  });

  it("should be able to read the right type of files", function() {
    expect(XhrFileReader.canReadFile("fakefile")).toBe(false);
    expect(XhrFileReader.canReadFile("http://localhost")).toBe(true);
    expect(XhrFileReader.canReadFile(new Blob())).toBe(false);
  });

  var describeFileSizeTests = function(avoidHeadRequests: boolean) {
    describe("file size with" + avoidHeadRequests ? 'GET' : 'HEAD', function() {
      beforeEach(function() {
        XhrFileReader.setConfig({
          avoidHeadRequests: avoidHeadRequests
        });
      });

      it("should have the right size information", function() {
        return new Promise(function(resolve, reject) {
          fileReader.init(throwOnError(resolve));
          jest.runAllTimers();
        }).then(function(tags) {
          expect(fileReader.getSize()).toBe(21);
        });
      });

      it("should have the right size information for files bigger than the first range request", function() {
        fileReader = new XhrFileReader("http://www.example.fakedomain/big-file.mp3");
        return new Promise(function(resolve, reject) {
          fileReader.init(throwOnError(resolve));
          jest.runAllTimers();
        }).then(function(tags) {
          expect(fileReader.getSize()).toBe(2079);
        });
      });

      it("should have the right size information when range not supported", function() {
        fileReader = new XhrFileReader("http://www.example.fakedomain/range-not-supported.mp3");
        return new Promise(function(resolve, reject) {
          fileReader.init(throwOnError(resolve));
          jest.runAllTimers();
        }).then(function(tags) {
          expect(fileReader.getSize()).toBe(2079);
        });
      });

      it("should have the right size information when content length is unknown", function() {
        fileReader = new XhrFileReader("http://www.example.fakedomain/unknown-length.mp3");
        return new Promise(function(resolve, reject) {
          fileReader.init(throwOnError(resolve));
          jest.runAllTimers();
        }).then(function(tags) {
          expect(fileReader.getSize()).toBe(2079);
        });
      });

      it("should have the right size information when range is supported", function() {
        fileReader = new XhrFileReader("http://www.example.fakedomain/range-supported.mp3");
        return new Promise(function(resolve, reject) {
          fileReader.init(throwOnError(resolve));
          jest.runAllTimers();
        }).then(function(tags) {
          expect(fileReader.getSize()).toBe(2079);
        });
      });
    });
  }

  describeFileSizeTests(true /*GET*/);
  describeFileSizeTests(false /*HEAD*/);

  it("should not fetch the same data twice", function() {
    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], throwOnError(function() {
        fileReader.loadRange([0, 4], throwOnError(resolve));
      }));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(require('xhr2').XMLHttpRequest.send.mock.calls.length).toBe(1);
    });
  });

  it("should read a byte", function() {
    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });

  it("should read a byte after loading the same range twice", function() {
    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], throwOnError(function() {
        fileReader.loadRange([0, 4], throwOnError(resolve));
      }));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });

  it("should not read a byte that hasn't been loaded yet", function() {
    return new Promise(function(resolve, reject) {
      fileReader.init(throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(function() {
        var byte0 = fileReader.getByteAt(2000);
      }).toThrow();
    });
  });

  it("should not read a file that does not exist", function() {
    fileReader = new XhrFileReader("http://www.example.fakedomain/fail.mp3");

    return new Promise(function(resolve, reject) {
      fileReader.init(throwOnSuccess(function(error) {
        expect(error.type).toBe("xhr");
        expect(error.xhr).toBeDefined();
        resolve();
      }));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(true).toBe(true);
    });
  });

  it("should fetch in multples of 1K", function() {
    return new Promise(function(resolve, reject) {
      fileReader._size=2000;
      fileReader.loadRange([0, 4], throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(require('xhr2').XMLHttpRequest.setRequestHeader.mock.calls[0][1]).toBe("bytes=0-1023");
    });
  });

  it("should not fetch more than max file size", function() {
    return new Promise(function(resolve, reject) {
      fileReader._size=10;
      fileReader.loadRange([0, 4], throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(require('xhr2').XMLHttpRequest.setRequestHeader.mock.calls[0][1]).toBe("bytes=0-10");
    });
  });

  it("should not use disallowed headers", function() {
    return new Promise(function(resolve, reject) {
      XhrFileReader.setConfig({
        disallowedXhrHeaders: ["If-Modified-Since"]
      });
      fileReader.loadRange([0, 4], throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      var calls = require('xhr2').XMLHttpRequest.setRequestHeader.mock.calls;
      for (var i = 0; i < calls.length; i++) {
        expect(calls[i][0].toLowerCase()).not.toBe("if-modified-since");
      }
    });
  });

  it("should not rely on content-length when range is not supported", function() {
    return new Promise(function(resolve, reject) {
      XhrFileReader.setConfig({
        avoidHeadRequests: true
      });
      require('xhr2').XMLHttpRequest.getAllResponseHeaders = jest.fn().mockReturnValue("");
      fileReader.init(throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(fileReader.getSize()).toBe(21);
    });
  });

  it("should timeout if request takes too much time", function() {
    fileReader = new XhrFileReader("http://www.example.fakedomain/timeout");
    XhrFileReader.setConfig({
      timeoutInSec: 0.2
    });
    return new Promise(function(resolve, reject) {
      fileReader.init(throwOnSuccess(function(error) {
        expect(error.type).toBe("xhr");
        expect(error.xhr).toBeDefined();
        resolve();
      }));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(true).toBe(true);
    });
  });
});
