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

/**
 * Pads an array with \0 until it is size length.
 */
const pad = function(array: Array<any>, size: number): Array<any> {
  for (var i = array.length; i < size; i++) {
    array.push(0);
  }
  return array;
}

// The ID3v2 tag/frame size is encoded with four bytes where the most
// significant bit (bit 7) is set to zero in every byte, making a total of 28
// bits. The zeroed bits are ignored, so a 257 bytes long tag is represented
// as $00 00 02 01.
const getSynchsafeInteger32 = function(number: number): ByteArray {
  // 0x7f = 0b01111111
  return [
    (number >> 21) & 0x7f,
    (number >> 14) & 0x7f,
    (number >> 7) & 0x7f,
    number & 0x7f
  ];
};

const getInteger32 = function(number: number): ByteArray {
  return [
    (number >> 24) & 0xff,
    (number >> 16) & 0xff,
    (number >> 8) & 0xff,
    number & 0xff
  ];
}

const getInteger24 = function(number: number): ByteArray {
  return [
    (number >> 16) & 0xff,
    (number >> 8) & 0xff,
    number & 0xff
  ];
}

module.exports = {
  bin: bin,
  pad: pad,
  getSynchsafeInteger32: getSynchsafeInteger32,
  getInteger32: getInteger32,
  getInteger24: getInteger24
};
