jest
  .mock('fs')
  .dontMock('../NodeFileReader.js')
  .dontMock('../MediaFileReader.js')
  .dontMock('../ChunkedFileData.js');

describe("NodeFileReader", function() {
  var NodeFileReader;
  var fileReader;

  beforeEach(function() {
    require('fs').__setMockFiles({
      "fakefile": "This is a simple file"
    });
    NodeFileReader = require('../NodeFileReader');
  });

  it("should be able to read the right type of files", function() {
    expect(NodeFileReader.canReadFile("fakefile")).toBe(true);
    expect(NodeFileReader.canReadFile("http://localhost")).toBe(false);
    expect(NodeFileReader.canReadFile(new Blob())).toBe(false);
  });

  pit("should have the right size information", function() {
    fileReader = new NodeFileReader("fakefile");

    return new Promise(function(resolve, reject) {
      fileReader.init({onSuccess: resolve, onError: reject});
    }).then(function(tags) {
      expect(fileReader.getSize()).toBe(21);
    });
  });

  pit("should read a byte", function() {
    fileReader = new NodeFileReader("fakefile");

    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], {onSuccess: resolve, onError: reject});
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });

  pit("should read a byte after loading the same range twice", function() {
    fileReader = new NodeFileReader("fakefile");

    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], {
        onSuccess: function() {
          fileReader.loadRange([0, 4], {onSuccess: resolve, onError: reject});
        },
        onError: reject
      });
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });

  pit("should not read a byte that hasn't been loaded yet", function() {
    fileReader = new NodeFileReader("fakefile");

    return new Promise(function(resolve, reject) {
      fileReader.init({onSuccess: resolve, onError: reject});
    }).then(function(tags) {
      expect(function() {
        var byte0 = fileReader.getByteAt(0);
      }).toThrow();
    });
  });

  pit("should not read a file that does not exist", function() {
    fileReader = new NodeFileReader("doesnt-exist");

    return new Promise(function(resolve, reject) {
      fileReader.init({
        onSuccess: reject,
        onError: function(error) {
          expect(error.type).toBe("fs");
          expect(error.info).toBeDefined();
          resolve();
        }
      });
    }).then(function(tags) {
      expect(true).toBe(true);
    });
  });
});
