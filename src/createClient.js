'use strict';

var Client = require('./client');
var assert = require('assert');

var encrypt = require('./client/encrypt');
var keepalive = require('./client/keepalive');
var compress = require('./client/compress');
var caseCorrect = require('./client/caseCorrect');
var setProtocol = require('./client/setProtocol');
var play = require('./client/play');
var tcp_dns = require('./client/tcp_dns');
var forgeHandshake = require('./client/forgeHandshake');
var autoVersion = require('./client/autoVersion');

module.exports=createClient;

function createClient(options) {
  assert.ok(options, "options is required");
  assert.ok(options.username, "username is required");

  // TODO: avoid setting default version if autoVersion is enabled
  var optVersion = options.version || require("./version").defaultVersion;

  var client = new Client(false, optVersion);

  tcp_dns(client, options);
  if (options.forgeMods) forgeHandshake(client, options);
  caseCorrect(client, options);
  if (options.version === false) autoVersion(client, options);
  setProtocol(client, options);
  keepalive(client, options);
  encrypt(client, options);
  play(client, options);
  compress(client, options);

  return client;
}
