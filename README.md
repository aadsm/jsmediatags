= JS MediaTags =

Intended to be the next version of https://github.com/aadsm/JavaScript-ID3-Reader.

NOTE: DO NOT USE
This is a work in progress. Currently only NodeJS and ID3v2 tags are supported. The API is most likely to change during development.

== How to use ==

Source code uses Flow for type checking meaning that a compilation step is needed to remove all type annotations.

Run `npm run build` to generate proper JavaScript code into the `build` directory.

```javascript
var jsmediatags = require('jsmediatags');
var NodeFileReader = jsmediatags.NodeFileReader;
var ID3v2TagReader = jsmediatags.ID3v2TagReader;

var fileReader = new NodeFileReader("./music-file.mp3");
var tagReader = new ID3v2TagReader(fileReader);
tagReader.read({
  onSuccess: function(tags) {
    console.log(tags);
  },
  onError: function() {
    console.log(':(');
  }
});
```

== Development ==

Run `npm run watch` to automatically recompile the source code whenever a file is changed.

=== New File Readers ===

Extend the `MediaFileReader` class to implement a new file reader. Methods to implement are:

* init
* loadRange
* getBytesLoaded
* getByteAt

Check `NodeFileReader` for an example.

=== New Tag Readers ===

Extend the `MediaTagReader` class to implement a new tag reader. Methods to implement are:

* getTagIdentifierByteRange
* canReadTagFormat
* \_loadData
* \_parseData

Check `ID3v2TagReader` for an example.

=== Unit Testing ===

Jest is the framework used. Run `npm test` to execute all the tests.

== Goals ==

* Improve the API of JavaScript-ID3-Reader
* Improve the source code with readable code and Flow annotated types
* Have unit tests
* Support NodeJS
