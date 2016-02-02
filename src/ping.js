'use strict';

var net = require('net');
var Client = require('./client');
var states = require("./states");
var tcp_dns = require('./client/tcp_dns');

module.exports = ping;

function ping(options, cb) {
  options.host = options.host || 'localhost';
  options.port = options.port || 25565;
  var optVersion = options.version || require("./version").defaultVersion;

  var client = new Client(false, optVersion);
  client.on('error', function(err) {
    cb(err);
  });

  client.once('server_info', function(packet) {
    var data = JSON.parse(packet.response);
    var start = Date.now();
    client.once('ping', function(packet) {
      data.latency = Date.now() - start;
      cb(null, data);
      client.end();
    });
    client.write('ping', {time: [0, 0]});
  });

  client.on('state', function(newState) {
    if(newState === states.STATUS)
      client.write('ping_start', {});
  });

  // TODO: refactor with src/client/setProtocol.js
  client.on('connect', function() {
    client.write('set_protocol', {
      protocolVersion: options.protocolVersion,
      serverHost: options.host,
      serverPort: options.port,
      nextState: 1
    });
    client.state = states.STATUS;
  });

  tcp_dns(client, options);
  options.connect(client);
}
