jest
  .dontMock('../ChunkedFileData.js');

var ChunkedFileData = require('../ChunkedFileData');

describe("ChunkedFileData", function() {
  var chunkedFileData;
  var someData = new Array(400);

  for (var i = 0; i < someData.length; i++) {
    someData[i] = i;
  }

  var sliceData = function(offset, length) {
    return someData.slice(offset, offset + length);
  }

  beforeEach(function() {
    chunkedFileData = new ChunkedFileData();
  });

  describe("adding data", function() {
    it("should add a chunk when there are no chunks", function() {
      var offset = 100;
      var data = sliceData(offset, 50);
      chunkedFileData.addData(offset, data);

      expect(chunkedFileData._fileData.length).toBe(1);
      var chunk = chunkedFileData._fileData[0];
      expect(chunk.offset).toBe(offset);
      expect(chunk.data).toEqual(data);
    });

    it("should add data at the end of the list", function() {
      chunkedFileData.addData(100, sliceData(100, 50));

      var offset = 200;
      var data = sliceData(offset, 50);
      chunkedFileData.addData(offset, data);

      expect(chunkedFileData._fileData.length).toBe(2);
      var chunk = chunkedFileData._fileData[1];
      expect(chunk.offset).toBe(offset);
      expect(chunk.data).toEqual(data);
    });

    it("should add data at the start of the list", function() {
      chunkedFileData.addData(100, sliceData(100, 50));

      var offset = 20;
      var data = sliceData(offset, 50);
      chunkedFileData.addData(offset, data);

      expect(chunkedFileData._fileData.length).toBe(2);
      var chunk = chunkedFileData._fileData[0];
      expect(chunk.offset).toBe(offset);
      expect(chunk.data).toEqual(data);
    });

    it("should add data in the middle of the list", function() {
      chunkedFileData.addData(100, sliceData(100, 50));
      chunkedFileData.addData(200, sliceData(200, 50));

      var offset = 160;
      var data = sliceData(offset, 20);
      chunkedFileData.addData(offset, data);

      expect(chunkedFileData._fileData.length).toBe(3);
      var chunk = chunkedFileData._fileData[1];
      expect(chunk.offset).toBe(offset);
      expect(chunk.data).toEqual(data);
    });

    describe("overlapping and adjacent data", function() {
      beforeEach(function() {
        chunkedFileData.addData(100, someData.slice(100, 150));
        chunkedFileData.addData(200, someData.slice(200, 250));
        chunkedFileData.addData(300, someData.slice(300, 350));
      });

      it("should expand chunk when data has more data at the tail", function() {
        var offset = 120;
        var data = sliceData(offset, 50);
        var chunksCount = chunkedFileData._fileData.length;
        chunkedFileData.addData(offset, data);

        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.offset).toBe(100);
        expect(chunk.data).toEqual(sliceData(100, 70));
      });

      it("should expand chunk when data coincides exactly with the end of a chunk", function() {
        var offset = 150;
        var data = sliceData(offset, 20);
        var chunksCount = chunkedFileData._fileData.length;

        chunkedFileData.addData(offset, data);
        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.data).toEqual(sliceData(100, 70));
      });

      it("should expand chunk when data has more data at the head", function() {
        var offset = 80;
        var data = sliceData(offset, 50);
        var chunksCount = chunkedFileData._fileData.length;
        chunkedFileData.addData(offset, data);

        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.offset).toBe(offset);
        expect(chunk.data).toEqual(sliceData(offset, 70));
      });

      it("should expand chunk when data coincides exactly with the start of a chunk", function() {
        var offset = 180;
        var data = sliceData(offset, 20);
        var chunksCount = chunkedFileData._fileData.length;

        chunkedFileData.addData(offset, data);
        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[1];
        expect(chunk.data).toEqual(sliceData(180, 70));
      });

      it("should expand chunk when data coincides exactly with the start of a chunk", function() {
        var offset = 180;
        var data = sliceData(offset, 20);
        var chunksCount = chunkedFileData._fileData.length;

        chunkedFileData.addData(offset, data);
        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[1];
        expect(chunk.data).toEqual(sliceData(180, 70));
      });

      it("should replace chunks when data overlaps at the head and at the tail", function() {
        var offset = 140;
        var data = sliceData(offset, 70);
        var chunksCount = chunkedFileData._fileData.length;
        chunkedFileData.addData(offset, data);

        expect(chunkedFileData._fileData.length).toBe(chunksCount - 1);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.offset).toBe(100);
        expect(chunk.data).toEqual(sliceData(100, 150));
      });

      it("should not change chunks when data is already stored", function() {
        var offset = 100;
        var data = sliceData(offset, 50);
        var chunksCount = chunkedFileData._fileData.length;

        chunkedFileData.addData(offset, data);
        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.data).toEqual(sliceData(offset, 50));
      });

      it("should remove chunks that are covered by new data", function() {
        var offset = 50;
        var data = sliceData(offset, 220);
        var chunksCount = chunkedFileData._fileData.length;

        chunkedFileData.addData(offset, data);
        expect(chunkedFileData._fileData.length).toBe(chunksCount-1);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.data).toEqual(sliceData(offset, 220));
      });

      it("should add data that completely covers an existing chunk", function() {
        var offset = 100;
        var data = sliceData(offset, 70);
        var chunksCount = chunkedFileData._fileData.length;

        chunkedFileData.addData(offset, data);
        expect(chunkedFileData._fileData.length).toBe(chunksCount);
        var chunk = chunkedFileData._fileData[0];
        expect(chunk.data).toEqual(sliceData(offset, 70));
      });
    });
  });

  describe("range chunks", function() {
    beforeEach(function() {
      chunkedFileData.addData(100, someData.slice(100, 150));
      chunkedFileData.addData(200, someData.slice(200, 250));
      chunkedFileData.addData(300, someData.slice(300, 350));
    });

    it("should find no range when no chunks exist", function() {
      chunkedFileData = new ChunkedFileData();

      var range = chunkedFileData._getChunkRange(100, 200);
      expect(range.startIx).toBe(ChunkedFileData.NOT_FOUND, "startIx");
      expect(range.endIx).toBe(ChunkedFileData.NOT_FOUND, "endIx");
      expect(range.insertIx).toBe(0, "insertIx");
    })

    it("should find no range when offset is before any chunk", function() {
      var range = chunkedFileData._getChunkRange(50, 70);
      expect(range.startIx).toBe(ChunkedFileData.NOT_FOUND, "startIx");
      expect(range.endIx).toBe(ChunkedFileData.NOT_FOUND, "endIx");
      expect(range.insertIx).toBe(0, "insertIx");
    });

    it("should find no range when offset is after all chunks", function() {
      var range = chunkedFileData._getChunkRange(500, 600);
      expect(range.startIx).toBe(ChunkedFileData.NOT_FOUND, "startIx");
      expect(range.endIx).toBe(ChunkedFileData.NOT_FOUND, "endIx");
      expect(range.insertIx).toBe(3, "insertIx");
    });

    it("should find no range when offset is between chunks", function() {
      var range = chunkedFileData._getChunkRange(170, 190);
      expect(range.startIx).toBe(ChunkedFileData.NOT_FOUND, "startIx");
      expect(range.endIx).toBe(ChunkedFileData.NOT_FOUND, "endIx");
      expect(range.insertIx).toBe(1, "insertIx");
    });

    it("should find a range when offset completly overlaps a chunk", function() {
      var range = chunkedFileData._getChunkRange(170, 270);
      expect(range.startIx).toBe(1, "startIx");
      expect(range.endIx).toBe(1, "endIx");
    });

    it("should find a range when offset completly overlaps several chunks", function() {
      var range = chunkedFileData._getChunkRange(50, 500);
      expect(range.startIx).toBe(0, "startIx");
      expect(range.endIx).toBe(2, "endIx");
    });

    it("should find a range when offset is completly overlapped by a chunk", function() {
      var range = chunkedFileData._getChunkRange(210, 240);
      expect(range.startIx).toBe(1, "startIx");
      expect(range.endIx).toBe(1, "endIx");
    });

    it("should find a range when offset head partially overlapps a chunk", function() {
      var range = chunkedFileData._getChunkRange(210, 270);
      expect(range.startIx).toBe(1, "startIx");
      expect(range.endIx).toBe(1, "endIx");
    });

    it("should find a range when offset tail partially overlapps a chunk", function() {
      var range = chunkedFileData._getChunkRange(170, 210);
      expect(range.startIx).toBe(1, "startIx");
      expect(range.endIx).toBe(1, "endIx");
    });

    it("should find a range when offset is left adjacent to a chunk", function() {
      var range = chunkedFileData._getChunkRange(170, 199);
      expect(range.startIx).toBe(1, "startIx");
      expect(range.endIx).toBe(1, "endIx");
    });

    it("should find a range when offset is right adjacent to a chunk", function() {
      var range = chunkedFileData._getChunkRange(250, 270);
      expect(range.startIx).toBe(1, "startIx");
      expect(range.endIx).toBe(1, "endIx");
    });
  });

  describe("hasDataRange", function() {
    beforeEach(function() {
      chunkedFileData.addData(100, someData.slice(100, 150));
      chunkedFileData.addData(200, someData.slice(200, 250));
      chunkedFileData.addData(300, someData.slice(300, 350));
    });

    it("should not have data range when offsets are after all chunks", function() {
      var hasRange = chunkedFileData.hasDataRange(400, 500);
      expect(hasRange).toBe(false);
    });

    it("should not have data range when offsets are in between chunks", function() {
      var hasRange = chunkedFileData.hasDataRange(270, 290);
      expect(hasRange).toBe(false);
    });

    it("should not have data range when offsets are partially overlapping a chunk", function() {
      var hasRange = chunkedFileData.hasDataRange(230, 270);
      expect(hasRange).toBe(false);
    });

    it("should have data range when offsets are completely overlapping a chunk", function() {
      var hasRange = chunkedFileData.hasDataRange(210, 240);
      expect(hasRange).toBe(true);
    });

    it("should have data range when offsets match a chunk", function() {
      var hasRange = chunkedFileData.hasDataRange(200, 249);
      expect(hasRange).toBe(true);
    });

    it("should not have data range when offsets does not match a chunk by 1", function() {
      var hasRange = chunkedFileData.hasDataRange(200, 250);
      expect(hasRange).toBe(false);
    });
  });

  it("should read data when offsets match", function() {
    chunkedFileData.addData(0, [0x01, 0x02, 0x03, 0x04, 0x05]);
    var iByte = chunkedFileData.getByteAt(2);

    expect(iByte).toBe(0x03);
  });

  it("should read data when offsets are mapped", function() {
    chunkedFileData.addData(100, [0x01, 0x02, 0x03, 0x04, 0x05]);
    var iByte = chunkedFileData.getByteAt(102);

    expect(iByte).toBe(0x03);
  });

  it("should read data from the right range", function() {
    chunkedFileData.addData(100, [0x01, 0x02, 0x03, 0x04, 0x05]);
    chunkedFileData.addData(200, [0x11, 0x12, 0x13, 0x14, 0x15]);
    var iByte = chunkedFileData.getByteAt(202);

    expect(iByte).toBe(0x13);
  });

  it("should fail to read when data is not loaded before any chunks", function() {
    chunkedFileData.addData(100, [0x01, 0x02, 0x03, 0x04, 0x05]);

    expect(function() {
      chunkedFileData.getByteAt(0);
    }).toThrow();
  });

  it("should fail to read when data is not loaded between chunks", function() {
    chunkedFileData.addData(0, [0x01, 0x02, 0x03, 0x04, 0x05]);
    chunkedFileData.addData(100, [0x01, 0x02, 0x03, 0x04, 0x05]);

    expect(function() {
      chunkedFileData.getByteAt(50);
    }).toThrow();
  });

  it("should fail to read when data is not loaded after all chunks", function() {
    chunkedFileData.addData(0, [0x01, 0x02, 0x03, 0x04, 0x05]);

    expect(function() {
      chunkedFileData.getByteAt(100);
    }).toThrow();
  });

  it("should add TypedArrays", function() {
    var intArray = new Uint8Array(new Buffer([0x01, 0x02, 0x03, 0x04, 0x05]));
    chunkedFileData.addData(5, intArray);

    expect(function() {
      // Append
      chunkedFileData.addData(6, intArray);
      // Prepend
      chunkedFileData.addData(1, intArray);
    }).not.toThrow();
  });
});
