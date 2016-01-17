/**
 * This is only used for testing, but could be used for other purposes as
 * writing.
 *
 * http://atomicparsley.sourceforge.net/mpeg-4files.html
 *
 * @flow
 */
'use strict';

const ByteArrayUtils = require('./ByteArrayUtils');
const bin = ByteArrayUtils.bin;
const pad = ByteArrayUtils.pad;
const getInteger32 = ByteArrayUtils.getInteger32;

import type {
  ByteArray
} from './FlowTypes';

class MP4TagContents {
  _atoms: Array<Atom>;

  constructor(ftyp: string, atoms?: Array<Atom>) {
    this._atoms = [
      new Atom("ftyp", pad(bin(ftyp), 24))
    ].concat(atoms || []);
  }

  toArray(): ByteArray {
    return this._atoms.reduce(function(array, atom) {
      return array.concat(atom.toArray());
    }, []);
  }

  static createAtom(atomName: string): Atom {
    return new Atom(atomName);
  }

  static createContainerAtom(atomName: string, atoms: Array<Atom>, data?: ByteArray): Atom {
    return new Atom(atomName, data, atoms);
  }

  static createMetadataAtom(atomName: string, type: string, data: ByteArray): Atom {
    var klass = {
      "uint8": 0,
      "uint8b": 21, // Apple changed from 21 to 0 in latest versions
      "text": 1,
      "jpeg": 13,
      "png": 14,
    }[type];

    return this.createContainerAtom(atomName, [
      new Atom("data", [].concat(
        [0x00, 0x00, 0x00, klass], // 1 byte atom version + 3 byte atom flags
        [0x00, 0x00, 0x00, 0x00], // NULL space
        data
      ))
    ]);
  }
}

class Atom {
  _name: string;
  _data: Array<number>;
  _atoms: Array<Atom>;

  constructor(name: string, data: ?ByteArray, atoms: ?Array<Atom>) {
    this._name = name;
    this._data = data || [];
    this._atoms = atoms || [];
  }

  toArray(): ByteArray {
    var atomsArray = this._atoms.reduce(function(array, atom) {
      return array.concat(atom.toArray());
    }, []);
    var length = 4 + this._name.length + this._data.length + atomsArray.length;

    return [].concat(
      getInteger32(length),
      bin(this._name),
      this._data,
      atomsArray
    );
  }
}

module.exports = MP4TagContents;
