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
    require('xhr2').__setMockUrls({
      "http://www.example.fakedomain/music.mp3": "This is a simple file"
    });
    fileReader = new XhrFileReader("http://www.example.fakedomain/music.mp3");
  });

  it("should be able to read the right type of files", function() {
    expect(XhrFileReader.canReadFile("fakefile")).toBe(false);
    expect(XhrFileReader.canReadFile("http://localhost")).toBe(true);
    expect(XhrFileReader.canReadFile(new Blob())).toBe(false);
  });

  pit("should have the right size information", function() {
    return new Promise(function(resolve, reject) {
      fileReader.init(throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(fileReader.getSize()).toBe(21);
    });
  });

  pit("should read a byte", function() {
    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });

  pit("should read a byte after loading the same range twice", function() {
    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], throwOnError(function() {
        fileReader.loadRange([0, 4], throwOnError(resolve));
      }));
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });

  pit("should not read a byte that hasn't been loaded yet", function() {
    return new Promise(function(resolve, reject) {
      fileReader.init(throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(function() {
        var byte0 = fileReader.getByteAt(0);
      }).toThrow();
    });
  });

  pit("should not read a file that does not exist", function() {
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
});
