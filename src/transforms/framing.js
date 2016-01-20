'use strict';

var readVarInt = require("protodef").types.varint[0];
var writeVarInt = require("protodef").types.varint[1];
var sizeOfVarInt = require("protodef").types.varint[2];
var Transform = require("readable-stream").Transform;

module.exports.createSplitter = function() {
  return new Splitter();
};

module.exports.createFramer = function() {
  return new Framer();
};

class Framer extends Transform {
  constructor() {
    super();
  }

  _transform(chunk, enc, cb) {
    var buffer = new Buffer(sizeOfVarInt(chunk.length));
    writeVarInt(chunk.length, buffer, 0);
    this.push(buffer);
    this.push(chunk);
    return cb();
  }
}

class Splitter extends Transform {
  constructor() {
    super();
    this.buffer = new Buffer(0);
  }
  _transform(chunk, enc, cb) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    var offset = 0;

    var result = readVarInt(this.buffer, offset) || { error: "Not enough data" };
    var size = result.size;
    var value = result.value;
    var error = result.error;
    while (!error && this.buffer.length >= offset + size + value)
    {
      this.push(this.buffer.slice(offset + size, offset + size + value));
      offset += size + value;
      result = readVarInt(this.buffer, offset) || { error: "Not enough data" };
      size = result.size;
      value = result.value;
      error = result.error;
    }
    this.buffer = this.buffer.slice(offset);
    return cb();
  }
}

