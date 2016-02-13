'use strict';

const nbt = require('prismarine-nbt');
const UUID = require('uuid-1345');

module.exports = {
  'UUID': [readUUID, writeUUID, 16],
  'nbt': [readNbt, writeNbt, sizeOfNbt],
  'optionalNbt':[readOptionalNbt,writeOptionalNbt,sizeOfOptionalNbt],
  'restBuffer': [readRestBuffer, writeRestBuffer, sizeOfRestBuffer],
  'entityMetadataLoop': [readEntityMetadata, writeEntityMetadata, sizeOfEntityMetadata]
};

function readUUID(buffer, offset) {
  return {
    value: UUID.stringify(buffer.slice(offset,16+offset)),
    size: 16
  };
}

function writeUUID(value, buffer, offset) {
  const buf=UUID.parse(value);
  buf.copy(buffer,offset);
  return offset + 16;
}

function readNbt(buffer, offset) {
  return nbt.proto.read(buffer,offset,"nbt");
}

function writeNbt(value, buffer, offset) {
  return nbt.proto.write(value,buffer,offset,"nbt");
}

function sizeOfNbt(value) {
  return nbt.proto.sizeOf(value,"nbt");
}


function readOptionalNbt(buffer, offset) {
  if(buffer.readInt8(offset) == 0) return {size:1};
  return nbt.proto.read(buffer,offset,"nbt");
}

function writeOptionalNbt(value, buffer, offset) {
  if(value==undefined) {
    buffer.writeInt8(0,offset);
    return offset+1;
  }
  return nbt.proto.write(value,buffer,offset,"nbt");
}

function sizeOfOptionalNbt(value) {
  if(value==undefined)
    return 1;
  return nbt.proto.sizeOf(value,"nbt");
}

function readRestBuffer(buffer, offset) {
  return {
    value: buffer.slice(offset),
    size: buffer.length - offset
  };
}

function writeRestBuffer(value, buffer, offset) {
  value.copy(buffer, offset);
  return offset + value.length;
}

function sizeOfRestBuffer(value) {
  return value.length;
}

function readEntityMetadata(buffer, offset, info) {
  let type = info.type;
  let endVal = info.endVal;
  let cursor = offset;
  const metadata = [];
  let item;
  while(true) {
    item = buffer.readUInt8(cursor);
    if(item === endVal) {
      return {
        value: metadata,
        size: cursor + 1 - offset
      };
    }
    const results = this.read(buffer, cursor, type, {});
    metadata.push(results.value);
    cursor += results.size;
  }
}

function writeEntityMetadata(value, buffer, offset, info) {
  let type = info.type;
  let endVal = info.endVal;
  const self = this;
  value.forEach(function(item) {
    offset = self.write(item, buffer, offset, type, {});
  });
  buffer.writeUInt8(endVal, offset);
  return offset + 1;
}

function sizeOfEntityMetadata(value, info) {
  let type = info.type;
  let size = 1;
  for(let i = 0; i < value.length; ++i) {
    size += this.sizeOf(value[i], type, {});
  }
  return size;
}
