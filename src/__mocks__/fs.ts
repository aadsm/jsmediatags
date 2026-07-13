/**
 * Extended from https://facebook.github.io/jest/docs/manual-mocks.html
 */
// Get the real (not mocked) version of the 'path' module
import path from 'path';

// Get the automatic mock for `fs`
var fsMock: any = jest.genMockFromModule('fs');

// This is a custom function that our tests can use during setup to specify
// what the files on the "mock" filesystem should look like when any of the
// `fs` APIs are used.
var _mockFiles: any = {};
function __setMockFiles(newMockFiles: any) {
  _mockFiles = {};

  for (var file in newMockFiles) {
    var dir = path.dirname(file);

    if (!_mockFiles[dir]) {
      _mockFiles[dir] = {};
    }

    _mockFiles[dir][path.basename(file)] = newMockFiles[file];
  }
};

// A custom version of `readdirSync` that reads from the special mocked out
// file list set via __setMockFiles
function readdirSync(directoryPath: any) {
  return _mockFiles[directoryPath] || [];
};

var _fds: any[] = [];
function open(path: any, flags: any, mode: any, callback: any) {
  var fd = _fds.push({
    path: path
  }) - 1;

  process.nextTick(function() {
    if (callback) {
      callback(null, fd);
    }
  });
}

function read(fd: any, buffer: any, offset: any, length: any, position: any, callback: any) {
  var file = _fds[fd];
  var dir = path.dirname(file.path);
  var name = path.basename(file.path);

  if (_mockFiles[dir] && _mockFiles[dir][name]) {
    var data = _mockFiles[dir][name].substr(position, length);
    buffer.write(data, offset, length);
    process.nextTick(function() {
      callback(null, length, buffer);
    });
  } else {
    process.nextTick(function() {
      callback(new Error("File not found"));
    });
  }
}

function stat(_path: any, callback: any) {
  var dir = path.dirname(_path);
  var name = path.basename(_path);

  if (_mockFiles[dir] && _mockFiles[dir][name]) {
    process.nextTick(function() {
      callback(null, {
        size: _mockFiles[dir][name].length
      });
    });
  } else {
    process.nextTick(function() {
      callback({});
    })
  }
}

// Override the default behavior of the `readdirSync` mock
fsMock.readdirSync.mockImplementation(readdirSync);
fsMock.open.mockImplementation(open);
fsMock.read.mockImplementation(read);
fsMock.stat.mockImplementation(stat);

// Add a custom method to the mock
fsMock.__setMockFiles = __setMockFiles;

export default fsMock;
