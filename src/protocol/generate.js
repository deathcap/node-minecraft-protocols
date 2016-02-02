'use strict';

const minecraft_data = require('minecraft-data');
const fs = require('fs');
const states = require('../states');
const supportedVersions = require('../').supportedVersions;

function createProtocolSpec(version, state, direction)
{
  const mcData = minecraft_data(version);
  const packets = mcData.protocol.states[state][direction];
  const versionTypes = mcData.protocol.types;

  const protoTypes = {};

  Object.keys(versionTypes).forEach((name) => {
    protoTypes[name] = versionTypes[name];
  });

  Object.keys(packets).forEach((name) => {
    protoTypes["packet_"+name] = ["container",packets[name].fields];
  });

  protoTypes.packet = ["container", [
    { "name": "name", "type":["mapper",{"type": "varint" ,
      "mappings":Object.keys(packets).reduce((acc,name) => {
        acc[parseInt(packets[name].id)]=name;
        return acc;
      },{})
    }]},
    { "name": "params", "type": ["switch", {
      "compareTo": "name",
      "fields": Object.keys(packets).reduce((acc,name) => {
        acc[name]="packet_"+name;
        return acc;
      },{})
    }]}
  ]];

  return protoTypes;
}

function createProtocolSpecs()
{
  const protocolSpecs = {};

  supportedVersions.forEach((version) => {
    protocolSpecs[version] = {};

    Object.keys(states).forEach((stateName) => {
      const state = states[stateName];

      protocolSpecs[version][state] = {};

      protocolSpecs[version][state].toServer = createProtocolSpec(version, state, 'toServer');
      protocolSpecs[version][state].toClient = createProtocolSpec(version, state, 'toClient');
    });
  });

  return protocolSpecs;
}

function writeProtocolSpecs(protocolSpecs)
{
  Object.keys(protocolSpecs).forEach((version) => {
    const protocolSpec = protocolSpecs[version];

    const filename = `src/protocol/${version}.json`;
    const json = JSON.stringify(protocolSpec, null, '  ');

    fs.writeFile(filename, json, (err) => {
      if (err) console.log(`Failed to write ${filename}: ${err}`);
    });
  });
}

const protocolSpecs = createProtocolSpecs();
//console.log(JSON.stringify(protocolSpecs));
writeProtocolSpecs(protocolSpecs);

