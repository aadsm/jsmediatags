jest
  .dontMock('../MediaTagReader.js');

const MediaTagReader = require('../MediaTagReader');
const MediaFileReader = require('../MediaFileReader');

describe("MediaTagReader", function() {
  var mediaTagReader;
  var mediaFileReader;

  beforeEach(function() {
    mediaFileReader = new MediaFileReader();
    mediaFileReader.init =
      jest.fn().mockImplementation(function(callbacks) {
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      });
    mediaTagReader = new MediaTagReader(mediaFileReader);
  });

  it("can read the data given by _parseData", function() {
    var expectedTags = {};
    mediaTagReader._loadData =
      jest.fn().mockImplementation(function(_, callbacks) {
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      });
    mediaTagReader._parseData =
      jest.fn().mockImplementation(function() {
        return expectedTags;
      });

    return new Promise(function(resolve, reject) {
      mediaTagReader.read({onSuccess: resolve, onError: reject});
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags).toBe(expectedTags);
    });
  });

  it("should _loadData when it needs to be read", function() {
    mediaTagReader._loadData = jest.fn().mockImplementation(
      function(localMediaFileReader, callbacks) {
        expect(localMediaFileReader).toBe(mediaFileReader);
        setTimeout(function() {
          callbacks.onSuccess();
        }, 1);
      }
    );
    mediaTagReader._parseData = jest.fn();

    return new Promise(function(resolve, reject) {
      mediaTagReader.read({onSuccess: resolve, onError: reject});
      jest.runAllTimers();
    }).then(function(tags) {
      expect(mediaTagReader._loadData).toBeCalled();
    });
  });
});
