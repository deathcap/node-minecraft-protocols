'use strict';

var readVarInt = require("protodef").types.varint[0];
var writeVarInt = require("protodef").types.varint[1];
var sizeOfVarInt = require("protodef").types.varint[2];
var zlib = require("zlib");
var Transform = require("readable-stream").Transform;

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
        var buf = new Buffer(sizeOfVarInt(chunk.length) + newChunk.length);
        var offset = writeVarInt(chunk.length, buf, 0);
        newChunk.copy(buf, offset);
        this.push(buf);
        return cb();
      });
    }
    else
    {
      var buf = new Buffer(sizeOfVarInt(0) + chunk.length);
      var offset = writeVarInt(0, buf, 0);
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
    var result  = readVarInt(chunk, 0);
    var size = result.size;
    var value = result.value;
    var error = result.error;
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
