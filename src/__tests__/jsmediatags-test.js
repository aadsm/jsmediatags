jest
  .dontMock("../jsmediatags.js")
  .dontMock("../ByteArrayUtils.js");

const jsmediatags = require("../jsmediatags");
const NodeFileReader = require("../NodeFileReader");
const XhrFileReader = require("../XhrFileReader");
const ID3v1TagReader = require("../ID3v1TagReader");
const ID3v2TagReader = require("../ID3v2TagReader");
const MP4TagReader = require("../MP4TagReader");

function throwOnSuccess(onError) {
  return {
    onSuccess: function() {
      throw new Error();
    },
    onError: onError
  }
}

describe("jsmediatags", function() {
  var mockFileReader;
  var mockTags = {};

  beforeEach(function() {
    jsmediatags.Config.removeTagReader(ID3v1TagReader);
    jsmediatags.Config.removeTagReader(MP4TagReader);
    // Reset auto mock to its original state.
    NodeFileReader.canReadFile = jest.genMockFunction();
    NodeFileReader.prototype.init = jest.genMockFunction()
      .mockImplementation(function(callbacks) {
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      });
    NodeFileReader.prototype.loadRange = jest.genMockFunction()
      .mockImplementation(function(range, callbacks) {
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      });

    ID3v2TagReader.getTagIdentifierByteRange.mockReturnValue(
      {offset: 0, length: 0}
    );
    ID3v2TagReader.prototype.setTagsToRead = jest.genMockFunction().mockReturnThis();
  });

  pit("should read tags with the shortcut function", function() {
    NodeFileReader.canReadFile.mockReturnValue(true);
    ID3v2TagReader.canReadTagFormat.mockReturnValue(true);
    ID3v2TagReader.prototype.read = jest.genMockFunction()
      .mockImplementation(function(callbacks) {
        callbacks.onSuccess(mockTags);
      });

    return new Promise(function(resolve, reject) {
      jsmediatags.read("fakefile", {onSuccess: resolve, onError: reject});
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags).toBe(mockTags);
    });
  });

  describe("file readers", function() {
    it("should use the given file reader", function() {
      var reader = new jsmediatags.Reader();
      var MockFileReader = jest.genMockFunction();

      reader.setFileReader(MockFileReader);
      var fileReader = reader._getFileReader();

      expect(fileReader).toBe(MockFileReader);
    });

    it("should use the node file reader", function() {
      NodeFileReader.canReadFile.mockReturnValue(true);

      var reader = new jsmediatags.Reader();
      var FileReader = reader._getFileReader();

      expect(FileReader).toBe(NodeFileReader);
    });

    it("should use the XHR file reader", function() {
      XhrFileReader.canReadFile.mockReturnValue(true);

      var reader = new jsmediatags.Reader();
      var FileReader = reader._getFileReader();

      expect(FileReader).toBe(XhrFileReader);
    });
  });

  describe("tag readers", function() {
    pit("should use the given tag reader", function() {
      var MockTagReader = jest.genMockFunction();

      return new Promise(function(resolve, reject) {
        var reader = new jsmediatags.Reader();
        reader.setTagReader(MockTagReader);
        reader._getTagReader(null, {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function(TagReader) {
        expect(TagReader).toBe(MockTagReader);
      });
    });

    pit("should use the tag reader that is able to read the tags", function() {
      var MockTagReader = jest.genMockFunction();
      jsmediatags.Config.addTagReader(MockTagReader);

      ID3v2TagReader.canReadTagFormat.mockReturnValue(false);
      MockTagReader.getTagIdentifierByteRange = jest.genMockFunction()
        .mockReturnValue([]);
      MockTagReader.canReadTagFormat = jest.genMockFunction()
        .mockReturnValue(true);

      return new Promise(function(resolve, reject) {
        var reader = new jsmediatags.Reader();
        reader._getTagReader(new NodeFileReader(), {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function(TagReader) {
        jsmediatags.Config.removeTagReader(MockTagReader);

        expect(TagReader).toBe(MockTagReader);
      });
    });

    pit("should fail if no tag reader is found", function() {
      ID3v2TagReader.canReadTagFormat.mockReturnValue(false);
      return new Promise(function(resolve, reject) {
        var reader = new jsmediatags.Reader();
        reader._getTagReader(new NodeFileReader(), throwOnSuccess(resolve));
        jest.runAllTimers();
      });
    });

    pit("should load the super set range of all tag reader ranges", function() {
      var MockTagReader = jest.genMockFunction();
      jsmediatags.Config.addTagReader(MockTagReader);

      ID3v2TagReader.canReadTagFormat.mockReturnValue(false);
      ID3v2TagReader.getTagIdentifierByteRange.mockReturnValue(
        {offset: 2, length: 3}
      );
      MockTagReader.getTagIdentifierByteRange = jest.genMockFunction()
        .mockReturnValue({offset: 5, length: 2});
      MockTagReader.canReadTagFormat = jest.genMockFunction()
        .mockReturnValue(true);

      return new Promise(function(resolve, reject) {
        var reader = new jsmediatags.Reader();
        reader._findTagReader(new NodeFileReader(), {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function() {
        jsmediatags.Config.removeTagReader(MockTagReader);
        var rangeSuperset = NodeFileReader.prototype.loadRange.mock.calls[0][0];
        expect(rangeSuperset).toEqual([2, 6]);
      });
    });

    pit("should not load the entire file if two tag loaders require start and end ranges for tag identifier", function() {
      var fileReader = new NodeFileReader();
      var MockTagReader = jest.genMockFunction();
      jsmediatags.Config.addTagReader(MockTagReader);

      fileReader.getSize.mockReturnValue(1024);

      ID3v2TagReader.canReadTagFormat.mockReturnValue(false);
      ID3v2TagReader.getTagIdentifierByteRange.mockReturnValue(
        {offset: 0, length: 3}
      );
      MockTagReader.getTagIdentifierByteRange = jest.genMockFunction()
        .mockReturnValue({offset: -3, length: 3});
      MockTagReader.canReadTagFormat = jest.genMockFunction()
        .mockReturnValue(true);

      return new Promise(function(resolve, reject) {
        var reader = new jsmediatags.Reader();
        reader._findTagReader(fileReader, {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function() {
        jsmediatags.Config.removeTagReader(MockTagReader);
        var loadRangeCalls = NodeFileReader.prototype.loadRange.mock.calls;
        expect(loadRangeCalls[0][0]).toEqual([0, 2]);
        expect(loadRangeCalls[1][0]).toEqual([1021, 1023]);
      });
    });
  });
});
