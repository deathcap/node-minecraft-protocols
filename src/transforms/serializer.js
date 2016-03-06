'use strict';

const ProtoDef = require("protodef").ProtoDef;
const Serializer = require("protodef").Serializer;
const Parser = require("protodef").Parser;

const minecraft = require("../datatypes/minecraft");
const states = require("../states");
const merge=require("lodash.merge");
const get=require("lodash.get");

function recursiveAddTypes(protocol,protocolData,path)
{
  if(protocolData===undefined)
    return;
  if(protocolData.types)
    protocol.addTypes(protocolData.types);
  recursiveAddTypes(protocol,get(protocolData,path.shift()),path);
}

function createProtocol(state,direction,version,customPackets)
{
  const proto = new ProtoDef();
  proto.addTypes(minecraft);
  const mcData=require("minecraft-data")(version);
  recursiveAddTypes(proto,merge(mcData.protocol,get(customPackets,[mcData.version.majorVersion])),[state,direction]);
  return proto;
}

function createSerializer(opts)
{
  opts = opts || {};
  const state = opts.state !== undefined ? opts.state : states.HANDSHAKING;
  const isServer = opts.isServer !== undefined ? opts.isServer : false;
  const version = opts.version;
  const customPackets = opts.customPackets;

  const mcData=require("minecraft-data")(version);
  const direction = !isServer ? 'toServer' : 'toClient';
  const packets = mcData.protocol.states[state][direction];
  const proto=createProtocol(mcData.protocol.types,packets,customPackets);
  return new Serializer(proto,"packet");
}

function createDeserializer(opts)
{
  opts = opts || {};
  const state = opts.state !== undefined ? opts.state : states.HANDSHAKING;
  const isServer = opts.isServer !== undefined ? opts.isServer : false;
  const packetsToParse = opts.packetsToParse !== undefined ? opts.packetsToParse : {"packet": true};
  const version = opts.version;
  const customPackets = opts.customPackets;

  const mcData=require("minecraft-data")(version);
  const direction = isServer ? "toServer" : "toClient";
  const packets = mcData.protocol.states[state][direction];
  const proto=createProtocol(mcData.protocol.types,packets);
  return new Parser(proto,"packet",customPackets);
}

module.exports = {
  createSerializer:createSerializer,
  createDeserializer:createDeserializer
};
