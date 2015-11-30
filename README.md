# JS MediaTags

Intended to be the next version of https://github.com/aadsm/JavaScript-ID3-Reader.

NOTE: DO NOT USE
This is a work in progress. Currently only NodeJS, Browser and ID3v2 tags are supported. The API is most likely to change during development.

## Current Support

* File Readers
  * NodeJS
  * Browser
* Tag Readers
  * ID3v2 (unsynchronisation is not supported)

## How to use

### NodeJS

Run `npm install jsmediatags --save` to install.

```javascript
// Simple API - will fetch all tags
var jsmediatags = require("jsmediatags");

jsmediatags.read("./music-file.mp3", {
  onSuccess: function(tags) {
    console.log(tags);
  },
  onError: function(error) {
    console.log(':(', error.type, error[error.type]);
  }
});

// Advanced API
var jsmediatags = require("jsmediatags");

new jsmediatags.Reader("http://www.example.com/music-file.mp3")
  .setTags(["title", "artist"])
  .read({
    onSuccess: function(tags) {
      console.log(tags);
    },
    onError: function(error) {
      console.log(':(', error.type, error[error.type]);
    }
  });
```

### Browser

Copy the [`dist/jsmediatags.min.js`](https://github.com/aadsm/jsmediatags/blob/master/dist/jsmediatags.min.js) file into your web application directory and include it with a script tag.
UMD will give you multiple usage options to use it:

```javascript
// As a global Object
var jsmediatags = window.jsmediatags;

// As a CommonJS Module
var jsmediatags = require("jsmediatags");
```

You can find more about UMD usage options [here](http://www.forbeslindesay.co.uk/post/46324645400/standalone-browserify-builds).

## Documentation

This library uses file readers (MediaFileReader API) to read the file itself and media tag readers (MediaTagReader API) to parse the tags in the file.

By default the library will automatically pick the most appropriate file reader depending on the file location. In the common case this will be the URL or local path where the file is located.

A similar approach is taken for the tag reader. The most appropriate tag reader will be selected depending on the tag signature found in the file.

However, you can specify exactly which file reader or tag reader to use using the advanced API.

New file and tag readers can be implemented by extending the MediaFileReader and MediaTagReader classes. Check the `Development` section down bellow for more information.

### Reference

* `jsmediatags.Reader`
  * `setTags(tags: Array<string>)` - Specify which tags to read
  * `setFileReader(fileReader: typeof MediaFileReader)` - Use this particular file reader
  * `setTagReader(tagReader: typeof MediaTagReader)` - Use this particular tag reader
  * `read({onSuccess, onError})` - Read the tags.

* `jsmediatags.Config`
  * `addFileReader(fileReader: typeof MediaFileReader)` - Add a new file reader to the automatic detection system.
  * `addTagReader(tagReader: typeof MediaTagReader)` - Add a new tag reader to the automatic detection system.

## Development

Source code uses Flow for type checking meaning that a compilation step is needed to remove all type annotations.
When using this library with NodeJS you can use the runtime compilation that is supported by babel. It will be slightly slower but no compilation step is required.

### NodeJS (With Runtime Compilation)

```javascript
require('babel-core/register');

var NodeFileReader = require('./src/NodeFileReader');
var ID3v2TagReader = require('./src/ID3v2TagReader');
...
```

### NodeJS (With Compiled Code (faster))

Run `npm run build` to generate proper JavaScript code into the `build` directory.

```javascript
var NodeFileReader = require('./build/NodeFileReader');
var ID3v2TagReader = require('./build/ID3v2TagReader');
...
```

Run `npm run watch` to automatically recompile the source code whenever a file is changed.

### Browser

Run `npm run dist` to generate a UMD version of this library that is ready to be used in a browser.

Two packages are created for the browser: `dist/jsmediatags.min.js` and `dist/jsmediatags.js`. One is a minimized version that is meant to be used in production and the other a regular version meant to be used for debugging.

Run `npm run dist-watch` to recompile and browserify the source code whenever a file is changed. This will only regenerate the `dist/jsmediatags.js` file.

### New File Readers

Extend the `MediaFileReader` class to implement a new file reader. Methods to implement are:

* init
* loadRange
* getBytesLoaded
* getByteAt

Current Implementations:
* [NodeFileReader](https://github.com/aadsm/jsmediatags/blob/master/src/NodeFileReader.js) (NodeJS)
* [XhrFileReader](https://github.com/aadsm/jsmediatags/blob/master/src/XhrFileReader.js) (Browser and NodeJS)

### New Tag Readers

Extend the `MediaTagReader` class to implement a new tag reader. Methods to implement are:

* getTagIdentifierByteRange
* canReadTagFormat
* \_loadData
* \_parseData

Current Implementations:
* [ID3v2TagReader](https://github.com/aadsm/jsmediatags/blob/master/src/ID3v2TagReader.js)

### Unit Testing

Jest is the framework used. Run `npm test` to execute all the tests.

## Goals

* Improve the API of JavaScript-ID3-Reader
* Improve the source code with readable code and Flow annotated types
* Have unit tests
* Support NodeJS
