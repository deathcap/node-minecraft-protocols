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
    const varIntSize=sizeOfVarInt(chunk.length);
    var buffer = new Buffer(varIntSize + chunk.length);
    writeVarInt(chunk.length, buffer, 0);
    chunk.copy(buffer, varIntSize);
    this.push(buffer);
    return cb();
  }
}

const LEGACY_PING_PACKET_ID = 0xfe;

class Splitter extends Transform {
  constructor() {
    super();
    this.buffer = new Buffer(0);
    this.recognizeLegacyPing = false;
  }
  _transform(chunk, enc, cb) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    if (this.recognizeLegacyPing && this.buffer[0] === LEGACY_PING_PACKET_ID) {
      // legacy_server_list_ping packet follows a different protocol format
      // prefix the encoded varint packet id for the deserializer
      var header = new Buffer(sizeOfVarInt(LEGACY_PING_PACKET_ID));
      writeVarInt(LEGACY_PING_PACKET_ID, header, 0);
      var payload = this.buffer.slice(1); // remove 0xfe packet id
      if (payload.length === 0) payload = new Buffer('\0'); // TODO: update minecraft-data to recognize a lone 0xfe, https://github.com/PrismarineJS/minecraft-data/issues/95
      this.push(Buffer.concat([header, payload]));
      return cb();
    }

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

