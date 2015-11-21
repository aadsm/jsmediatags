/**
 * @flow
 */
'use strict';

import type {
  ByteArray
} from './FlowTypes';

/**
 * Converts a string to a binary array
 */
const bin = function(string: string): ByteArray {
  var binaryArray = new Array(string.length);
  for (var i = 0; i < string.length; i++) {
    binaryArray[i] = string.charCodeAt(i);
  }
  return binaryArray;
};

module.exports = {
  bin: bin
};
