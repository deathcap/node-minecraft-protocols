'use strict';

var ProtoDef = require("protodef").ProtoDef;
var Serializer = require("protodef").Serializer;
var Parser = require("protodef").Parser;

var minecraft = require("../datatypes/minecraft");
var states = require("../states");
var protocolSpecs = require('../protocol');

function createProtocol(version, state, direction)
{
  var proto = new ProtoDef();
  proto.addType("string",["pstring",{
    countType:"varint"
  }]);
  proto.addTypes(minecraft);

  if (!protocolSpecs[version]) throw new Error(`no protocol specification for version: ${version}`);

  var protocolSpec = protocolSpecs[version][state][direction];

  Object.keys(protocolSpec).forEach((name) => {
    proto.addType(name, protocolSpec[name]);
  });

  return proto;
}

function createSerializer(opts)
{
  opts = opts || {};
  var state = opts.state !== undefined ? opts.state : states.HANDSHAKING;
  var isServer = opts.isServer !== undefined ? opts.isServer : false;
  var version = opts.version;
  var direction = !isServer ? 'toServer' : 'toClient';
  var proto = createProtocol(version, state, direction);

  return new Serializer(proto,"packet");
}

function createDeserializer(opts)
{
  opts = opts || {};
  var state = opts.state !== undefined ? opts.state : states.HANDSHAKING;
  var isServer = opts.isServer !== undefined ? opts.isServer : false;
  var packetsToParse = opts.packetsToParse !== undefined ? packetsToParse : {"packet": true};
  var version = opts.version;
  var direction = isServer ? "toServer" : "toClient";
  var proto = createProtocol(version, state, direction);

  return new Parser(proto,"packet");
}

module.exports = {
  createSerializer:createSerializer,
  createDeserializer:createDeserializer
};
