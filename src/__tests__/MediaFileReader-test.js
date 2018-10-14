jest
  .dontMock('../MediaFileReader.js')
  .dontMock('../StringUtils.js');

var MediaFileReader = require('../MediaFileReader');

describe("MediaFileReader", function() {
  var mediaFileReader;
  var mediaFileBytes = [];

  beforeEach(function() {
    mediaFileReader = new MediaFileReader();
    mediaFileReader.getByteAt =
      jest.fn().mockImplementation(function(offset) {
        return mediaFileBytes[offset];
      });
  });

  it("should throw when trying to get the size before init()", function() {
    expect(function() {
      mediaFileReader.getSize();
    }).toThrow(new Error('init() must be called first.'));
  });

  describe("isBitSetAt", function() {
    beforeEach(function() {
      mediaFileBytes = [0x0f];
    });

    it("should check if a bit is set", function() {
      var isSet = mediaFileReader.isBitSetAt(0, 0);
      expect(isSet).toBe(true);
    });

    it("should check if a bit is not set", function() {
      var isSet = mediaFileReader.isBitSetAt(0, 7);
      expect(isSet).toBe(false);
    });
  });

  it("should read bytes", function() {
    mediaFileBytes = [0x01, 0x02, 0x03, 0x04];
    var bytes = mediaFileReader.getBytesAt(0, 4);
    expect(bytes).toEqual(mediaFileBytes);
  });

  describe("getSByteAt", function() {
    it("should read a signed byte", function() {
      mediaFileBytes = [0xff];
      var iByte = mediaFileReader.getSByteAt(0);
      expect(iByte).toBe(-1);
    });

    it("should read a signed byte", function() {
      mediaFileBytes = [0x01];
      var iByte = mediaFileReader.getSByteAt(0);
      expect(iByte).toBe(1);
    });
  });

  describe("getShortAt", function() {
    it("should read an unsigned short in big endian", function() {
      mediaFileBytes = [0xf0, 0x00];
      var iShort = mediaFileReader.getShortAt(0, true);
      expect(iShort).toBe(61440);
    });

    it("should read an unsigned short in little endian", function() {
      mediaFileBytes = [0x00, 0xf0];
      var iShort = mediaFileReader.getShortAt(0, false);
      expect(iShort).toBe(61440);
    });
  });

  describe("getSShortAt", function() {
    it("should read an signed short in big endian", function() {
      mediaFileBytes = [0xf0, 0x00];
      var iShort = mediaFileReader.getSShortAt(0, true);
      expect(iShort).toBe(-4096);
    });

    it("should read an signed short in little endian", function() {
      mediaFileBytes = [0x00, 0xf0];
      var iShort = mediaFileReader.getSShortAt(0, false);
      expect(iShort).toBe(-4096);
    });
  });

  describe("getLongAt", function() {
    it("should read an unsigned long in big endian", function() {
      mediaFileBytes = [0xf0, 0x00, 0x00, 0x00];
      var iLong = mediaFileReader.getLongAt(0, true);
      expect(iLong).toBe(4026531840);
    });

    it("should read an unsigned long in little endian", function() {
      mediaFileBytes = [0x00, 0x00, 0x00, 0xf0];
      var iLong = mediaFileReader.getLongAt(0, false);
      expect(iLong).toBe(4026531840);
    });
  });

  describe("getSLongAt", function() {
    it("should read an signed long in big endian", function() {
      mediaFileBytes = [0xf0, 0x00, 0x00, 0x00];
      var iLong = mediaFileReader.getSLongAt(0, true);
      expect(iLong).toBe(-268435456);
    });

    it("should read an signed long in little endian", function() {
      mediaFileBytes = [0x00, 0x00, 0x00, 0xf0];
      var iLong = mediaFileReader.getSLongAt(0, false);
      expect(iLong).toBe(-268435456);
    });
  });

  describe("getSLongAt", function() {
    it("should read a 24bit integer in big endian", function() {
      mediaFileBytes = [0xf0, 0x00, 0x00];
      var iInt = mediaFileReader.getInteger24At(0, true);
      expect(iInt).toBe(15728640);
    });

    it("should read a 24bit integer in little endian", function() {
      mediaFileBytes = [0x00, 0x00, 0xf0];
      var iInt = mediaFileReader.getInteger24At(0, false);
      expect(iInt).toBe(15728640);
    });
  });

  it("should read a string at offset", function() {
    mediaFileBytes = [0x48, 0x65, 0x6c, 0x6c, 0x6f];
    var string = mediaFileReader.getStringAt(0, 5);
    expect(string).toBe("Hello");
  });

  describe("getStringWithCharsetAt", function() {
    it("should a null terminated string", function() {
      mediaFileBytes = [0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00];
      var string = mediaFileReader.getStringWithCharsetAt(0, 6, 'ascii');

      expect(string.length).toBe(5);

      expect(string.toString()).toEqual("Hello");
    });

    it("should a utf-8 string", function() {
      // Olá in UTF-8
      mediaFileBytes = [0x4f, 0x6c, 0xc3, 0xa1];
      var string = mediaFileReader.getStringWithCharsetAt(0, 4, 'utf-8');

      expect(string.length).toBe(3);

      expect(string.toString()).toEqual("Olá");
    });

    it("should a utf-16 BE-BOM header string", function() {
      // Olá in UTF-16BE
      mediaFileBytes = [0xfe, 0xff, 0x00, 0x4f, 0x00, 0x6c, 0x00, 0xe1];
      var string = mediaFileReader.getStringWithCharsetAt(0, 8, 'utf-16');

      expect(string.length).toBe(3);

      expect(string.toString()).toEqual("Olá");
    });

    it("should a utf-16 LE-BOM header string", function() {
      // Olá in UTF-16BE
      mediaFileBytes = [0xff, 0xfe, 0x4f, 0x00, 0x6c, 0x00, 0xe1, 0x00];
      var string = mediaFileReader.getStringWithCharsetAt(0, 8, 'utf-16');

      expect(string.length).toBe(3);

      expect(string.toString()).toEqual("Olá");
    });

    it("should a utf-16be string", function() {
      // Olá in UTF-16BE
      mediaFileBytes = [0x00, 0x4f, 0x00, 0x6c, 0x00, 0xe1];
      var string = mediaFileReader.getStringWithCharsetAt(0, 6, 'utf-16be');

      expect(string.length).toBe(3);

      expect(string.toString()).toEqual("Olá");
    });

    it("should a utf-16le string", function() {
      // Olá in UTF-16LE
      mediaFileBytes = [0x4f, 0x00, 0x6c, 0x00, 0xe1, 0x00];
      var string = mediaFileReader.getStringWithCharsetAt(0, 6, 'utf-16le');

      expect(string.length).toBe(3);

      expect(string.toString()).toEqual("Olá");
    });
  });

  it("should read a char", function() {
    mediaFileBytes = [0x61];
    var string = mediaFileReader.getCharAt(0);

    expect(string.toString()).toEqual("a");
  });

});
