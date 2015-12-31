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
    }).then(function(tag) {
      var tags = tag.tags;
      expect(tags['©nam'].data).toBe("A Title");
    });
  });

  pit("reads uint8 tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      var tags = tag.tags;
      expect(tags.cpil.data).toBeTruthy();
    });
  });

  pit("reads jpeg tag", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      var tags = tag.tags;
      expect("covr" in tags).toBeTruthy();
      expect(tags.covr.data.format).toBe("image/jpeg");
      expect(tags.covr.data.data).toEqual([0x01, 0x02, 0x03]);
    });
  });

  pit("reads all tags", function() {
    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tag) {
      var tags = tag.tags;
      expect("©nam" in tags).toBeTruthy();
      expect("©ART" in tags).toBeTruthy();
      expect("©alb" in tags).toBeTruthy();
      expect("trkn" in tags).toBeTruthy();
      expect("©cmt" in tags).toBeTruthy();
      expect("cpil" in tags).toBeTruthy();
      expect("covr" in tags).toBeTruthy();
    });
  });
});
