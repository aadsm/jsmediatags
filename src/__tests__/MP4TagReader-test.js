jest.autoMockOff();

const MP4TagReader = require('../MP4TagReader');
const MP4TagContents = require('../MP4TagContents');
const ArrayFileReader = require('../ArrayFileReader');

const bin = require('../ByteArrayUtils').bin;
const pad = require('../ByteArrayUtils').pad;

function createMP4FileContents(atoms) {
  return new MP4TagContents(
    MP4TagContents.createContainerAtom("moov", [
      MP4TagContents.createAtom("mvhd"),
      MP4TagContents.createAtom("trak"),
      MP4TagContents.createContainerAtom("udta", [
        MP4TagContents.createContainerAtom("meta", [
          MP4TagContents.createAtom("hdlr"),
          MP4TagContents.createContainerAtom("ilst", atoms)
        ], [0x00, 0x00, 0x00, 0x01])
      ])
    ])
  );
}

describe("MP4TagReader", function() {
  var tagReader;
  var mediaFileReader;
  var mp4FileContents = createMP4FileContents([
    MP4TagContents.createMetadataAtom("©nam", "text", bin("A Title")),
    MP4TagContents.createMetadataAtom("©ART", "text", bin("A Artist")),
    MP4TagContents.createMetadataAtom("©alb", "text", bin("A Album")),
    MP4TagContents.createMetadataAtom("trkn", "uint8", [].concat(
      [0x00, 0x00],
      [0x00, 0x02], // track
      [0x00, 0x09] // total track count
    )),
    MP4TagContents.createMetadataAtom("©cmt", "text", bin("A Comment")),
    MP4TagContents.createMetadataAtom("cpil", "uint8", [0x01]),
    MP4TagContents.createMetadataAtom("covr", "jpeg", [0x01, 0x02, 0x03])
  ]);

  beforeEach(function() {
    mediaFileReader = new ArrayFileReader(mp4FileContents.toArray());
    tagReader = new MP4TagReader(mediaFileReader);
  });

  pit("reads string tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags.title).toBe("A Title");
    });
  });

  pit("reads uint8 tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags.compilation).toBeTruthy();
    });
  });

  pit("reads jpeg tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect("picture" in tags).toBeTruthy();
      expect(tags.picture.format).toBe("image/jpeg");
      expect(tags.picture.data).toEqual([0x01, 0x02, 0x03]);
    });
  });

  pit("reads all tags", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect("title" in tags).toBeTruthy();
      expect("artist" in tags).toBeTruthy();
      expect("album" in tags).toBeTruthy();
      expect("track" in tags).toBeTruthy();
      expect("count" in tags).toBeTruthy();
      expect("comment" in tags).toBeTruthy();
      expect("compilation" in tags).toBeTruthy();
      expect("picture" in tags).toBeTruthy();
    });
  });
});
