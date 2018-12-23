# JS MediaTags (web)
> web friendly version of https://github.com/aadsm/jsmediatags

This library it's just a fork of the great **jsmediatags**. The only difference is that everything not related with browser has been removed, things like:

* Node.js support
* React native support
* XHR Reader
* External dependencies (xhr2, buffer, react-native-fs)

So you can just import this module as any other library. Before that was not possible since the library was expecting some Node.js modules being present.

### Usage 

```javascript
import jsmediatags from 'jsmediatags-web'

jsmediatags.read(file, {
  onSuccess({tags}) {
    console.log(tags)
  },
  onError(error: Error) {
    console.log(error);
  }
}
```

### Bundle size

Since some stuff has been removed, bundle size is smaller now:

* jsmediatags: 44.3kB MINIFIED / 11.6kB MINIFIED + GZIPPED => https://bundlephobia.com/result?p=jsmediatags
* jsmediatags-web: 

### Installation

```
$ yarn add jsmediatags-web
```

### Documentation

https://github.com/aadsm/jsmediatags

### TODO

* Remove react-native tooling
* Support esm