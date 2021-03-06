'use strict';

const readVarInt = require("protodef").types.varint[0];
const writeVarInt = require("protodef").types.varint[1];
const sizeOfVarInt = require("protodef").types.varint[2];
const PartialReadError = require("protodef").utils.PartialReadError;
const Transform = require("readable-stream").Transform;

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
    const buffer = new Buffer(varIntSize + chunk.length);
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
      const header = new Buffer(sizeOfVarInt(LEGACY_PING_PACKET_ID));
      writeVarInt(LEGACY_PING_PACKET_ID, header, 0);
      let payload = this.buffer.slice(1); // remove 0xfe packet id
      if (payload.length === 0) payload = new Buffer('\0'); // TODO: update minecraft-data to recognize a lone 0xfe, https://github.com/PrismarineJS/minecraft-data/issues/95
      this.push(Buffer.concat([header, payload]));
      return cb();
    }

    let offset = 0;
    let value, size, error;
    let stop=false;
    try {
      let result = readVarInt(this.buffer, offset);
      size = result.size;
      value = result.value;
      error = result.error;
    }
    catch(e) {
      if(!(e.partialReadError)) {
        throw e;
      }
      else
        stop=true;
    }
    if(!stop) while (this.buffer.length >= offset + size + value)
    {
      try {
        this.push(this.buffer.slice(offset + size, offset + size + value));
        offset += size + value;
        let result = readVarInt(this.buffer, offset);
        size = result.size;
        value = result.value;
        error = result.error;
      }
      catch(e) {
        if(e.partialReadError) {
          break;
        }
        else
          throw e;
      }
    }
    this.buffer = this.buffer.slice(offset);
    return cb();
  }
}

