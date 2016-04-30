/**
 * @flow
 */
'use strict';

import type {
  StreamCallbackType
} from './FlowTypes';

class MediaStreamTagReader {
  _url: string;

  constructor(url: string) {
    this._url = url;
  }

  read(callbacks: StreamCallbackType) {
    throw new Error("Must implement read function");
  }
}

module.exports = MediaStreamTagReader;
