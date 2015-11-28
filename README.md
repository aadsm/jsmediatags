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
var jsmediatags = require("jsmediatags");
var NodeFileReader = jsmediatags.NodeFileReader;
var ID3v2TagReader = jsmediatags.ID3v2TagReader;

var fileReader = new NodeFileReader("./music-file.mp3");
var tagReader = new ID3v2TagReader(fileReader);
tagReader.read({
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
var XhrFileReader = window.jsmediatags.XhrFileReader;
var ID3v2TagReader = window.jsmediatags.ID3v2TagReader;

// As a CommonJS Module
var jsmediatags = require("jsmediatags");
var XhrFileReader = jsmediatags.XhrFileReader;
var ID3v2TagReader = jsmediatags.ID3v2TagReader;
```

You can find more about UMD usage options [here](http://www.forbeslindesay.co.uk/post/46324645400/standalone-browserify-builds).

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
