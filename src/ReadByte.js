
export function getByteAt(chunkedFileData, offset) {
  const buf = Buffer.alloc(1);
  const bytesRead = chunkedFileData.readToBuffer(buf, 0, offset, 1);

  if (bytesRead < 1) {
    throw new Error('Offset ' + offset + " hasn't been loaded yet.");
  }

  return buf[0];
}
