jest.autoMockOff();

const ArrayFileReader = require('../ArrayFileReader');
const FLACTagContents = require('../FLACTagContents');
const FLACTagReader = require('../FLACTagReader');

describe("FLACTagReader", function() {
  var flacFileContents = new FLACTagContents([FLACTagContents.createCommentBlock(
    ["TITLE", "A Title"],
    ["ARTIST", "An Artist"],
    ["ALBUM", "An Album"],
    ["TRACKNUMBER", "1"],
    ["GENRE", "A Genre"]
  ), FLACTagContents.createPictureBlock()]);
  var mediaFileReader;
  var tagReader;

  beforeEach(function() {
    mediaFileReader = new ArrayFileReader(flacFileContents.toArray());
    tagReader = new FLACTagReader(mediaFileReader);
  });

  it("reads the tag type", function () {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      expect(tag.type).toBe("FLAC");
      expect(tag.version).toBe("1");
    });
  });

  it("reads a string tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      var tags = tag.tags;
      expect(tags.title).toBe("A Title");
    });
  });

  it("reads an image tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      var tags = tag.tags;
      expect(tags.picture.description).toBe("A Picture");
    });
  });

  it("reads all tags", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      var tags = tag.tags;
      expect(tags.title).toBeTruthy();
      expect(tags.artist).toBeTruthy();
      expect(tags.album).toBeTruthy();
      expect(tags.track).toBeTruthy();
      expect(tags.picture).toBeTruthy();
    });
  });
  it("calls failure callback if file doesn't have comments", function() {
    var flacFileEmpty = new FLACTagContents();
    var fileReaderEmpty = new ArrayFileReader(flacFileEmpty.toArray());
    var tagReaderEmpty = new FLACTagReader(fileReaderEmpty);
    return new Promise(function(resolve, reject) {
      tagReaderEmpty.read({
        onSuccess: resolve,
        onError: reject
      });
      jest.runAllTimers();
    }).catch(function(error) {
      expect(error.type).toBe("loadData");
    });
  });
});
