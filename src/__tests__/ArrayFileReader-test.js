jest
  .dontMock('../ArrayFileReader.js')
  .dontMock('../MediaFileReader.js');

var ArrayFileReader = require('../ArrayFileReader');

function throwOnError(onSuccess) {
  return {
    onSuccess: onSuccess,
    onError: function() {
      throw new Error();
    }
  }
}

describe("ArrayFileReader", function() {
  var fileReader;

  beforeEach(function() {
    fileReader = new ArrayFileReader(new Buffer("This is a simple file"));
  });

  it("should be able to read the right type of files", function() {
    expect(ArrayFileReader.canReadFile(new Buffer('Test'))).toBe(true);
    expect(ArrayFileReader.canReadFile([10, 24])).toBe(true);
    expect(ArrayFileReader.canReadFile("fakefile")).toBe(false);
    expect(ArrayFileReader.canReadFile("http://localhost")).toBe(false);
    expect(ArrayFileReader.canReadFile(new Blob())).toBe(false);
  });

  it("should have the right size information", function() {
    return new Promise(function(resolve, reject) {
      fileReader.init(throwOnError(resolve));
      jest.runAllTimers();
    }).then(function() {
      expect(fileReader.getSize()).toBe(21);
    });
  });

  it("should read a byte", function() {
    return new Promise(function(resolve, reject) {
      fileReader.loadRange([0, 4], throwOnError(resolve));
      jest.runAllTimers();
    }).then(function(tags) {
      expect(fileReader.getByteAt(0)).toBe("T".charCodeAt(0));
    });
  });
});
