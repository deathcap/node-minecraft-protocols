'use strict';

const ProtoDef = require("protodef").ProtoDef;
const Serializer = require("protodef").Serializer;
const Parser = require("protodef").Parser;

const minecraft = require("../datatypes/minecraft");
const states = require("../states");

function createProtocol(types,packets)
{
  const proto = new ProtoDef();
  proto.addType("string",["pstring",{
    countType:"varint"
  }]);
  proto.addTypes(minecraft);
  proto.addTypes(types);

  Object.keys(packets).forEach(function(name) {
    proto.addType("packet_"+name,["container",packets[name].fields]);
  });

  proto.addType("packet",["container", [
    { "name": "name", "type":["mapper",{"type": "varint" ,
      "mappings":Object.keys(packets).reduce(function(acc,name){
        acc[parseInt(packets[name].id)]=name;
        return acc;
      },{})
    }]},
    { "name": "params", "type": ["switch", {
      "compareTo": "name",
      "fields": Object.keys(packets).reduce(function(acc,name){
        acc[name]="packet_"+name;
        return acc;
      },{})
    }]}
  ]]);
  return proto;
}

function createSerializer(opts)
{
  opts = opts || {};
  const state = opts.state !== undefined ? opts.state : states.HANDSHAKING;
  const isServer = opts.isServer !== undefined ? opts.isServer : false;
  const version = opts.version;

  const mcData=require("minecraft-data")(version);
  const direction = !isServer ? 'toServer' : 'toClient';
  const packets = mcData.protocol.states[state][direction];
  const proto=createProtocol(mcData.protocol.types,packets);
  return new Serializer(proto,"packet");
}

function createDeserializer(opts)
{
  opts = opts || {};
  const state = opts.state !== undefined ? opts.state : states.HANDSHAKING;
  const isServer = opts.isServer !== undefined ? opts.isServer : false;
  const packetsToParse = opts.packetsToParse !== undefined ? opts.packetsToParse : {"packet": true};
  const version = opts.version;


  const mcData=require("minecraft-data")(version);
  const direction = isServer ? "toServer" : "toClient";
  const packets = mcData.protocol.states[state][direction];
  const proto=createProtocol(mcData.protocol.types,packets);
  return new Parser(proto,"packet");
}

module.exports = {
  createSerializer:createSerializer,
  createDeserializer:createDeserializer
};
