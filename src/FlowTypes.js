/**
 * @flow
 */

var MediaFileReader = require('./MediaFileReader');

export type CallbackType = {
  onSuccess: (data: Object) => void,
  onError?: () => void
};

export type LoadCallbackType = {
  onSuccess: () => void,
  onError?: () => void
};

export type CharsetType =
  "utf-16" |
  "utf-16le" |
  "utf-16be" |
  "utf-8" |
  "iso-8859-1";

export type ChunkType = {
  offset: number,
  data: Array<number>
};

export type Byte = number;

export type ByteArray = Array<Byte>;

export type FrameReaderSignature = (
  offset: number,
  length: number,
  data: MediaFileReader,
  flags: ?Object,
  majorVersion?: string
) => any;

