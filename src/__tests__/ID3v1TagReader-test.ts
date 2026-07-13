jest.autoMockOff();

import ID3v1TagReader from '../ID3v1TagReader';
import ArrayFileReader from '../ArrayFileReader';

import { bin, pad } from '../ByteArrayUtils';

describe("ID3v1TagReader", function() {
  it("reads 1.0 tags", function() {
    var id3ArrayFile = ([] as any[]).concat(
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
      } as any);
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
    var id3ArrayFile = ([] as any[]).concat(
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
      } as any);
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
