import type MediaFileReader from './MediaFileReader';

import type {
  CallbackType,
  LoadCallbackType,
  ByteRange,
  TagType
} from './types';

class MediaTagReader {
  _mediaFileReader: MediaFileReader;
  _tags: Array<string> | null;

  constructor(mediaFileReader: MediaFileReader) {
    this._mediaFileReader = mediaFileReader;
    this._tags = null;
  }

  /**
   * Returns the byte range that needs to be loaded and fed to
   * _canReadTagFormat in order to identify if the file contains tag
   * information that can be read.
   */
  static getTagIdentifierByteRange(): ByteRange {
    throw new Error("Must implement");
  }

  /**
   * Given a tag identifier (read from the file byte positions speficied by
   * getTagIdentifierByteRange) this function checks if it can read the tag
   * format or not.
   */
  static canReadTagFormat(tagIdentifier: Array<number>): boolean {
    throw new Error("Must implement");
  }

  setTagsToRead(tags: Array<string>): MediaTagReader {
    this._tags = tags;
    return this;
  }

  read(callbacks: CallbackType) {
    var self = this;

    this._mediaFileReader.init({
      onSuccess: function() {
        self._loadData(self._mediaFileReader, {
          onSuccess: function() {
            var tags;
            try {
              tags = self._parseData(self._mediaFileReader, self._tags);
            } catch (ex: any) {
              if (callbacks.onError) {
                callbacks.onError({
                  "type": "parseData",
                  "info": ex.message
                });
                return;
              }
            }

            // TODO: destroy mediaFileReader
            callbacks.onSuccess(tags);
          },
          onError: callbacks.onError
        });
      },
      onError: callbacks.onError
    });
  }

  getShortcuts(): {[key: string]: (string|Array<string>)} {
    return {};
  }

  /**
   * Load the necessary bytes from the media file.
   */
  _loadData(
    mediaFileReader: MediaFileReader,
    callbacks: LoadCallbackType
  ): void {
    throw new Error("Must implement _loadData function");
  }

  /**
   * Parse the loaded data to read the media tags.
   */
  _parseData(mediaFileReader: MediaFileReader, tags: Array<string> | null): TagType {
    throw new Error("Must implement _parseData function");
  }

  _expandShortcutTags(tagsWithShortcuts?: Array<string> | null): Array<string> | null {
    if (!tagsWithShortcuts) {
      return null;
    }

    var tags: Array<string> = [];
    var shortcuts = this.getShortcuts();
    for (var i = 0, tagOrShortcut; tagOrShortcut = tagsWithShortcuts[i]; i++ ) {
      tags = tags.concat(shortcuts[tagOrShortcut]||[tagOrShortcut]);
    }

    return tags;
  }
}

export default MediaTagReader;
