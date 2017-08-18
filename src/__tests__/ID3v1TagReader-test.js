jest.autoMockOff();

const ID3v1TagReader = require('../ID3v1TagReader');
const ArrayFileReader = require('../ArrayFileReader');

const bin = require('../ByteArrayUtils').bin;
const pad = require('../ByteArrayUtils').pad;

describe("ID3v1TagReader", function() {
  it("reads 1.0 tags", function() {
    var id3ArrayFile = [].concat(
      bin("TAG"),
      pad(bin("Song Title"), 30),
      pad(bin("The Artist"), 30),
      pad(bin("The Album"), 30),
      bin("1995"),
      pad(bin("A Comment"), 30),
      30
    );
    var mediaFileReader = new ArrayFileReader(id3ArrayFile);
    var tagReader = new ID3v1TagReader(mediaFileReader);

    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags).toEqual({
        type: 'ID3',
        version: '1.0',
        tags: {
          title: 'Song Title',
          artist: 'The Artist',
          album: 'The Album',
          year: '1995',
          comment: 'A Comment',
          genre: 'Fusion'
        }
      });
    });
  });

  it("reads 1.1 tags", function() {
    var id3ArrayFile = [].concat(
      bin("TAG"),
      pad(bin("Song Title"), 30),
      pad(bin("The Artist"), 30),
      pad(bin("The Album"), 30),
      bin("1995"),
      pad(bin("A Comment"), 29),
      3,
      30
    );
    var mediaFileReader = new ArrayFileReader(id3ArrayFile);
    var tagReader = new ID3v1TagReader(mediaFileReader);

    return new Promise(function(resolve, reject) {
      tagReader.read({
        onSuccess: resolve,
        onFailure: reject
      });
      jest.runAllTimers();
    }).then(function(tags) {
      expect(tags).toEqual({
        type: 'ID3',
        version: '1.1',
        tags: {
          title: 'Song Title',
          artist: 'The Artist',
          album: 'The Album',
          year: '1995',
          comment: 'A Comment',
          track: 3,
          genre: 'Fusion'
        }
      });
    });
  });
});
