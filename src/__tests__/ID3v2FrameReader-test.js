jest.autoMockOff();

const ID3v2FrameReader = require('../ID3v2FrameReader');
const ArrayFileReader = require('../ArrayFileReader');
const bin = require('../ByteArrayUtils').bin;

describe("ID3v2FrameReader ", function() {
  it("should read APIC tag", function() {
    var frameReader = ID3v2FrameReader.getFrameReaderFunction("APIC");

    expect(frameReader).toBeDefined();

    var fileData = [].concat(
      [0x00], // text encoding
      bin("image/jpeg"), [0x00],
      [0x03], // picture type - cover front
      bin("front cover image"), [0x00],
      [0x01, 0x02, 0x03, 0x04, 0x05] // image data
    );
    var fileReader = new ArrayFileReader(fileData);
    var data = frameReader(0, fileData.length, fileReader);

    expect(data).toEqual({
      format: "image/jpeg",
      type: "Cover (front)",
      description: "front cover image",
      data: [0x01, 0x02, 0x03, 0x04, 0x05]
    });
  });

  it("should read COMM tag", function() {
    var frameReader = ID3v2FrameReader.getFrameReaderFunction("COMM");

    expect(frameReader).toBeDefined();

    var fileData = [].concat(
      [0x00], // text encoding
      bin("ENG"), // language
      bin("tl;dr"), [0x00], // short text description
      bin("The entire comment that can include new lines\n.")
    );
    var fileReader = new ArrayFileReader(fileData);
    var data = frameReader(0, fileData.length, fileReader);

    expect(data).toEqual({
      language: "ENG",
      short_description: "tl;dr",
      text: "The entire comment that can include new lines\n."
    });
  });

  it("should read PIC tag", function() {
    var frameReader = ID3v2FrameReader.getFrameReaderFunction("PIC");

    expect(frameReader).toBeDefined();

    var fileData = [].concat(
      [0x00], // text encoding
      bin("JPG"), // image format
      [0x03], // picture type - cover front
      bin("front cover image"), [0x00],
      [0x01, 0x02, 0x03, 0x04, 0x05] // image data
    );
    var fileReader = new ArrayFileReader(fileData);
    var data = frameReader(0, fileData.length, fileReader);

    expect(data).toEqual({
      format: "JPG",
      type: "Cover (front)",
      description: "front cover image",
      data: [0x01, 0x02, 0x03, 0x04, 0x05]
    });
  });

  it("should read PCNT tag", function() {
    var frameReader = ID3v2FrameReader.getFrameReaderFunction("PCNT");

    expect(frameReader).toBeDefined();

    var fileData = [].concat(
      [0xaf, 0x19, 0x00, 0x00]
    );
    var fileReader = new ArrayFileReader(fileData);
    var data = frameReader(0, fileData.length, fileReader);

    expect(data).toEqual(6575);
  });

  describe("T* text tags", function() {
    it("should read text with iso-8859-1 charset", function() {
      var frameReader = ID3v2FrameReader.getFrameReaderFunction("T*");

      expect(frameReader).toBeDefined();

      var fileData = [].concat(
        [0x00], // encoding
        [0xe3]
      );
      var fileReader = new ArrayFileReader(fileData);
      var data = frameReader(0, fileData.length, fileReader);

      expect(data).toEqual("ã");
    });

    it("should read text with utf-16 charset", function() {
      var frameReader = ID3v2FrameReader.getFrameReaderFunction("T*");

      expect(frameReader).toBeDefined();

      var fileData = [].concat(
        [0x01], // encoding
        [0xfe, 0xff, 0x00, 0xe3]
      );
      var fileReader = new ArrayFileReader(fileData);
      var data = frameReader(0, fileData.length, fileReader);

      expect(data).toEqual("ã");
    });

    it("should read text with utf-16be charset", function() {
      var frameReader = ID3v2FrameReader.getFrameReaderFunction("T*");

      expect(frameReader).toBeDefined();

      var fileData = [].concat(
        [0x02], // encoding
        [0xff, 0xfe, 0xe3, 0x00]
      );
      var fileReader = new ArrayFileReader(fileData);
      var data = frameReader(0, fileData.length, fileReader);

      expect(data).toEqual("ã");
    });

    it("should read text with utf-8 charset", function() {
      var frameReader = ID3v2FrameReader.getFrameReaderFunction("T*");

      expect(frameReader).toBeDefined();

      var fileData = [].concat(
        [0x03], // encoding
        [0xc3, 0xa3]
      );
      var fileReader = new ArrayFileReader(fileData);
      var data = frameReader(0, fileData.length, fileReader);

      expect(data).toEqual("ã");
    });
  });

  it("should read TCON tag", function() {
    var frameReader = ID3v2FrameReader.getFrameReaderFunction("TCON");

    expect(frameReader).toBeDefined();

    var fileData = [].concat(
      [0x00], // encoding
      bin("(10)Eurodisc")
    );
    var fileReader = new ArrayFileReader(fileData);
    var data = frameReader(0, fileData.length, fileReader);

    expect(data).toEqual("Eurodisc");
  });

  it("should read USLT tag", function() {
    var frameReader = ID3v2FrameReader.getFrameReaderFunction("USLT");

    expect(frameReader).toBeDefined();

    var fileData = [].concat(
      [0x00], // encoding
      bin("POR"), // language
      [0x00], // content descriptor
      bin("Se eu soubesse tinha ido com a Sofia")
    );
    var fileReader = new ArrayFileReader(fileData);
    var data = frameReader(0, fileData.length, fileReader);

    expect(data).toEqual({
      language: "POR",
      descriptor: "",
      lyrics: "Se eu soubesse tinha ido com a Sofia"
    });
  });
});
