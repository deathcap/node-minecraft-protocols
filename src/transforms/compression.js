'use strict';

const readVarInt = require("protodef").types.varint[0];
const writeVarInt = require("protodef").types.varint[1];
const sizeOfVarInt = require("protodef").types.varint[2];
const zlib = require("zlib");
const Transform = require("readable-stream").Transform;

module.exports.createCompressor = function(threshold) {
  return new Compressor(threshold);
};

module.exports.createDecompressor = function(threshold) {
  return new Decompressor(threshold);
};

class Compressor extends Transform {
  constructor(compressionThreshold) {
    super();
    if (compressionThreshold === undefined) compressionThreshold = -1;
    this.compressionThreshold = compressionThreshold;
  }

  _transform(chunk, enc, cb) {
    if (chunk.length >= this.compressionThreshold)
    {
      zlib.deflate(chunk, (err, newChunk) => {
        if (err)
          return cb(err);
        const buf = new Buffer(sizeOfVarInt(chunk.length) + newChunk.length);
        const offset = writeVarInt(chunk.length, buf, 0);
        newChunk.copy(buf, offset);
        this.push(buf);
        return cb();
      });
    }
    else
    {
      const buf = new Buffer(sizeOfVarInt(0) + chunk.length);
      const offset = writeVarInt(0, buf, 0);
      chunk.copy(buf, offset);
      this.push(buf);
      return cb();
    }
  }
}

class Decompressor extends Transform {
  constructor(compressionThreshold) {
    super();
    if (compressionThreshold === undefined) compressionThreshold = -1;
    this.compressionThreshold = compressionThreshold;
  }

  _transform(chunk, enc, cb) {
    const result = readVarInt(chunk, 0);
    const size = result.size;
    const value = result.value;
    const error = result.error;
    if (error)
      return cb(error);
    if (value === 0)
    {
      this.push(chunk.slice(size));
      return cb();
    }
    else
    {
      zlib.inflate(chunk.slice(size), (err, newBuf) => {
        if (err)
          return cb(err);
        this.push(newBuf);
        return cb();
      });
    }
  }
}
