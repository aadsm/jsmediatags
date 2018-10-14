jest.autoMockOff();

const ID3v2TagReader = require('../ID3v2TagReader');
const ID3v2TagContents = require('../ID3v2TagContents');
const ArrayFileReader = require('../ArrayFileReader');

const bin = require('../ByteArrayUtils').bin;

describe("ID3v2TagReader", function() {
  var tagReader;
  var mediaFileReader;
  var id3FileContents =
    new ID3v2TagContents(4, 3)
      .addFrame("TIT2", [].concat(
        [0x00], // encoding
        bin("The title"), [0x00]
      ))
      .addFrame("TCOM", [].concat(
        [0x00], // encoding
        bin("The Composer"), [0x00]
      ))
      .addFrame("\u0000\u0000\u0000\u0000", []); // Padding frame

  beforeEach(function() {
    mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
    tagReader = new ID3v2TagReader(mediaFileReader);
  });

  describe("header", function() {
    it("reads an header", function() {
      return new Promise(function(resolve, reject) {
        tagReader.read({
          onSuccess: resolve,
          onFailure: reject
        });
        jest.runAllTimers();
      }).then(function(tags) {
        delete tags.tags;
        expect(tags).toEqual({
          type: "ID3",
          version: "2.4.3",
          flags: {
            experimental_indicator: false,
            extended_header: false,
            unsynchronisation: false,
            footer_present: false
          },
          major: 4,
          revision: 3,
          size: 55
        });
      });
    });
    
    it("reads an header with extended header", function() {
      return new Promise(function(resolve, reject) {
        var id3FileContents =
          new ID3v2TagContents(4, 3)
            .addFrame("TIT2", [].concat(
              [0x00], // encoding
              bin("The title"), [0x00]
            ))
            .addFrame("TCOM", [].concat(
              [0x00], // encoding
              bin("The Composer"), [0x00]
            ))
            .setTagIsUpdate();

        mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
        tagReader = new ID3v2TagReader(mediaFileReader);

        tagReader.read({
          onSuccess: resolve,
          onFailure: reject
        });
        jest.runAllTimers();
      }).then(function(tags) {
        expect("TIT2" in tags.tags).toBeTruthy();
        expect("TCOM" in tags.tags).toBeTruthy();

        delete tags.tags;
        expect(tags).toEqual({
          type: "ID3",
          version: "2.4.3",
          flags: {
            experimental_indicator: false,
            extended_header: true,
            unsynchronisation: false,
            footer_present: false
          },
          major: 4,
          revision: 3,
          size: 51
        });
      });
    });

  });

  it("loads the entire tag", function() {
    mediaFileReader.loadRange = jest.fn().mockImplementation(
      function() {
        return ArrayFileReader.prototype.loadRange.apply(this, arguments);
      }
    );

    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      // The first call is the initial load to figure out the tag ID.
      let callArguments = mediaFileReader.loadRange.mock.calls[1];
      expect(callArguments[0]).toEqual([0, mediaFileReader._array.length-1]);
    });
  });

  it("reads tags", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect("TIT2" in tags.tags).toBeTruthy();
      expect(tags.tags.TIT2).toEqual({
        id: "TIT2",
        size: 11,
        description: "Title/songname/content description",
        data: "The title"
      });
    });
  });

  it("reads tags as shortcuts", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags.tags.title).toBe("The title");
    });
  });

  it("reads all tags when none is specified", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(Object.keys(tags.tags)).toContain("TIT2");
      expect(Object.keys(tags.tags)).toContain("TCOM");
    });
  });

  it("reads the specificed tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.setTagsToRead(["TCOM"])
        .read({
          onSuccess: resolve,
          onFailure: reject
        });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(Object.keys(tags.tags)).not.toContain("TIT2");
      expect(Object.keys(tags.tags)).toContain("TCOM");
    });
  });

  it("should ignore empty tags", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(Object.keys(tags.tags)).not.toContain("\u0000\u0000\u0000\u0000");
    });
  });

  describe("unsynchronisation", function() {
    it("reads global unsynchronised content", function() {
      var id3FileContents =
        new ID3v2TagContents(4, 3)
          .setFlags({
            unsynchronisation: true
          })
          .addFrame("TIT2", [].concat(
            [0x00], // encoding
            bin("The title"), [0x00]
          ))
          .addFrame("APIC", [].concat(
            [0x00], // text encoding
            bin("image/jpeg"), [0x00],
            [0x03], // picture type - cover front
            bin("front cover image"), [0x00],
            [0x01, 0x02, 0xff, 0x00, 0x03, 0x04, 0x05] // image data
          ));
      mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
      tagReader = new ID3v2TagReader(mediaFileReader);

      return new Promise(function(resolve, reject) {
        tagReader.read({
          onSuccess: resolve,
          onFailure: reject
        });
        jest.runAllTimers();
      }).then(function(tags) {
        expect(tags.tags.title).toBe("The title");
        expect(tags.tags.picture.data).toEqual([0x01, 0x02, 0xff, 0x03, 0x04, 0x05]);
      });
    });

    it("reads local unsynchronised content", function() {
      var id3FileContents =
        new ID3v2TagContents(4, 3)
          .addFrame("TIT2", [].concat(
            [0x00], // encoding
            bin("The title"), [0x00]
          ))
          .addFrame("APIC", [].concat(
            [0x00], // text encoding
            bin("image/jpeg"), [0x00],
            [0x03], // picture type - cover front
            bin("front cover image"), [0x00],
            [0x01, 0x02, 0xff, 0x00, 0x03, 0x04, 0x05] // image data
          ), {
            format: {
              unsynchronisation: true
            }
          });
      mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
      tagReader = new ID3v2TagReader(mediaFileReader);

      return new Promise(function(resolve, reject) {
        tagReader.read({
          onSuccess: resolve,
          onFailure: reject
        });
        jest.runAllTimers();
      }).then(function(tags) {
        expect(tags.tags.picture.data).toEqual([0x01, 0x02, 0xff, 0x03, 0x04, 0x05]);
      });
    });

    it("reads unsynchronised content with data length indicator", function() {
      var id3FileContents =
        new ID3v2TagContents(4, 3)
          .addFrame("TIT2", [].concat(
            [0x00], // encoding
            bin("The title"), [0x00]
          ))
          .addFrame("APIC", [].concat(
            [0x00], // text encoding
            bin("image/jpeg"), [0x00],
            [0x03], // picture type - cover front
            bin("front cover image"), [0x00],
            [0x01, 0x02, 0xff, 0x00, 0x03, 0x04, 0x05] // image data
          ), {
            format: {
              unsynchronisation: true,
              data_length_indicator: true,
            },
          }, 37);
      mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
      tagReader = new ID3v2TagReader(mediaFileReader);

      return new Promise(function(resolve, reject) {
        tagReader.read({
          onSuccess: resolve,
          onFailure: reject
        });
        jest.runAllTimers();
      }).then(function(tags) {
        expect(tags.tags.title).toBe("The title");
        expect(tags.tags.picture.data).toEqual([0x01, 0x02, 0xff, 0x03, 0x04, 0x05]);
      });
    });
  });

  it("should process frames with no content", function() {
    var id3FileContents =
      new ID3v2TagContents(4, 3)
        .addFrame("WOAF") // empty frame contents
        .addFrame("TIT2", [].concat(
          [0x00], // encoding
          bin("The title"), [0x00]
        ));
    mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
    tagReader = new ID3v2TagReader(mediaFileReader);

    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onError: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect("TIT2" in tags.tags).toBeTruthy();
    });
  });

  it("should correctly assign shortcuts to when there are multiple instances of the same frame", function() {
    var id3FileContents =
      new ID3v2TagContents(4, 3)
        .addFrame("TIT2", [].concat(
          [0x00], // encoding
          bin("The title"), [0x00]
        ))
        .addFrame("TIT2", [].concat(
          [0x00], // text encoding
          bin("Another title"), [0x00]
        ));
    mediaFileReader = new ArrayFileReader(id3FileContents.toArray());
    tagReader = new ID3v2TagReader(mediaFileReader);

    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags.tags.title).toBe("The title");
    });
  });
});
