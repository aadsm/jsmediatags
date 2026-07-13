jest
  .enableAutomock()
  .dontMock("../jsmediatags")
  .dontMock("../ByteArrayUtils");

// These modules are auto-mocked. They are loaded with require() rather than
// ES import because the _interopRequireDefault wrapper that Babel emits for
// default imports hides the module shape from Jest's automocker, leaving the
// real (unmocked) classes in place.
const jsmediatags = require('../jsmediatags');
const NodeFileReader = require('../NodeFileReader');
const XhrFileReader = require('../XhrFileReader');
const ArrayFileReader = require('../ArrayFileReader');
const ID3v1TagReader = require('../ID3v1TagReader');
const ID3v2TagReader = require('../ID3v2TagReader');
const MP4TagReader = require('../MP4TagReader');
const FLACTagReader = require('../FLACTagReader');

function throwOnSuccess(onError: any) {
  return {
    onSuccess: function() {
      throw new Error();
    },
    onError: onError
  }
}

describe("jsmediatags", function() {
  var mockFileReader: any;
  var mockTags = {};

  beforeEach(function() {
    jsmediatags.Config.removeTagReader(ID3v1TagReader);
    jsmediatags.Config.removeTagReader(MP4TagReader);
    jsmediatags.Config.removeTagReader(FLACTagReader);
    // Reset auto mock to its original state.
    NodeFileReader.canReadFile = jest.fn();
    NodeFileReader.prototype.init = jest.fn()
      .mockImplementation(function(callbacks) {
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      });
    NodeFileReader.prototype.loadRange = jest.fn()
      .mockImplementation(function(range, callbacks) {
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      });

    (ID3v2TagReader.getTagIdentifierByteRange as jest.Mock).mockReturnValue(
      {offset: 0, length: 0}
    );
    ID3v2TagReader.prototype.setTagsToRead = jest.fn().mockReturnThis();
  });

  it("should read tags with the shortcut function", function() {
    (NodeFileReader.canReadFile as jest.Mock).mockReturnValue(true);
    (ID3v2TagReader.canReadTagFormat as jest.Mock).mockReturnValue(true);
    ID3v2TagReader.prototype.read = jest.fn()
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
      var reader = new (jsmediatags.Reader as any)();
      var MockFileReader: any = jest.fn();

      reader.setFileReader(MockFileReader);
      var fileReader = reader._getFileReader();

      expect(fileReader).toBe(MockFileReader);
    });

    it("should use the node file reader", function() {
      (NodeFileReader.canReadFile as jest.Mock).mockReturnValue(true);

      var reader = new (jsmediatags.Reader as any)();
      var FileReader = reader._getFileReader();

      expect(FileReader).toBe(NodeFileReader);
    });

    it("should use the Array file reader for Buffers", function() {
      (ArrayFileReader.canReadFile as jest.Mock).mockReturnValue(true);

      var reader = new (jsmediatags.Reader as any)();
      var FileReader = reader._getFileReader();

      expect(FileReader).toBe(ArrayFileReader);
    });

    it("should use the XHR file reader", function() {
      (XhrFileReader.canReadFile as jest.Mock).mockReturnValue(true);

      var reader = new (jsmediatags.Reader as any)();
      var FileReader = reader._getFileReader();

      expect(FileReader).toBe(XhrFileReader);
    });
  });

  describe("tag readers", function() {
    it("should use the given tag reader", function() {
      var MockTagReader: any = jest.fn();

      return new Promise(function(resolve, reject) {
        var reader = new (jsmediatags.Reader as any)();
        reader.setTagReader(MockTagReader);
        reader._getTagReader(null as any, {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function(TagReader) {
        expect(TagReader).toBe(MockTagReader);
      });
    });

    it("should use the tag reader that is able to read the tags", function() {
      var MockTagReader: any = jest.fn();
      jsmediatags.Config.addTagReader(MockTagReader);

      (ID3v2TagReader.canReadTagFormat as jest.Mock).mockReturnValue(false);
      MockTagReader.getTagIdentifierByteRange = jest.fn()
        .mockReturnValue([]);
      MockTagReader.canReadTagFormat = jest.fn()
        .mockReturnValue(true);

      return new Promise(function(resolve, reject) {
        var reader = new (jsmediatags.Reader as any)();
        reader._getTagReader(new (NodeFileReader as any)(), {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function(TagReader) {
        jsmediatags.Config.removeTagReader(MockTagReader);

        expect(TagReader).toBe(MockTagReader);
      });
    });

    it("should fail if no tag reader is found", function() {
      (ID3v2TagReader.canReadTagFormat as jest.Mock).mockReturnValue(false);
      return new Promise(function(resolve, reject) {
        var reader = new (jsmediatags.Reader as any)();
        reader._getTagReader(new (NodeFileReader as any)(), throwOnSuccess(resolve));
        jest.runAllTimers();
      });
    });

    it("should load the super set range of all tag reader ranges", function() {
      var MockTagReader: any = jest.fn();
      jsmediatags.Config.addTagReader(MockTagReader);

      (ID3v2TagReader.canReadTagFormat as jest.Mock).mockReturnValue(false);
      (ID3v2TagReader.getTagIdentifierByteRange as jest.Mock).mockReturnValue(
        {offset: 2, length: 3}
      );
      MockTagReader.getTagIdentifierByteRange = jest.fn()
        .mockReturnValue({offset: 5, length: 2});
      MockTagReader.canReadTagFormat = jest.fn()
        .mockReturnValue(true);

      return new Promise(function(resolve, reject) {
        var reader = new (jsmediatags.Reader as any)();
        reader._findTagReader(new (NodeFileReader as any)(), {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function() {
        jsmediatags.Config.removeTagReader(MockTagReader);
        var rangeSuperset = (NodeFileReader.prototype.loadRange as jest.Mock).mock.calls[0][0];
        expect(rangeSuperset).toEqual([2, 6]);
      });
    });

    it("should not load the entire file if two tag loaders require start and end ranges for tag identifier", function() {
      var fileReader = new (NodeFileReader as any)();
      var MockTagReader: any = jest.fn();
      jsmediatags.Config.addTagReader(MockTagReader);

      fileReader.getSize.mockReturnValue(1024);

      (ID3v2TagReader.canReadTagFormat as jest.Mock).mockReturnValue(false);
      (ID3v2TagReader.getTagIdentifierByteRange as jest.Mock).mockReturnValue(
        {offset: 0, length: 3}
      );
      MockTagReader.getTagIdentifierByteRange = jest.fn()
        .mockReturnValue({offset: -3, length: 3});
      MockTagReader.canReadTagFormat = jest.fn()
        .mockReturnValue(true);

      return new Promise(function(resolve, reject) {
        var reader = new (jsmediatags.Reader as any)();
        reader._findTagReader(fileReader, {onSuccess: resolve, onError: reject});
        jest.runAllTimers();
      }).then(function() {
        jsmediatags.Config.removeTagReader(MockTagReader);
        var loadRangeCalls = (NodeFileReader.prototype.loadRange as jest.Mock).mock.calls;
        expect(loadRangeCalls[0][0]).toEqual([0, 2]);
        expect(loadRangeCalls[1][0]).toEqual([1021, 1023]);
      });
    });
  });
});
