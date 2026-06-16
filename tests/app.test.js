const assert = require('node:assert/strict');
const { test } = require('node:test');

const BufferCursor = require('buffercursor');
const WebSocket = require('ws');

const { start } = require('../app');
const Protocol16Deserializer = require('../scripts/classes/Protocol16Deserializer');
const Protocol18Deserializer = require('../scripts/classes/Protocol18Deserializer');
const PhotonPacketParser = require('../scripts/classes/PhotonPacketParser');
const EventCodes = require('../scripts/Utils/EventCodesApp.js');

async function closeClient(client) {
  if (!client || client.readyState === WebSocket.CLOSED) return;

  await new Promise((resolve) => {
    client.once('close', resolve);
    client.close();
  });
}

function waitForMessages(client, count) {
  const messages = [];

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${count} WebSocket messages.`));
    }, 2000);

    client.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));

      if (messages.length >= count) {
        clearTimeout(timeout);
        resolve(messages);
      }
    });
  });
}

test('server starts without capture and serves the main UI routes', async () => {
  const runtime = await start({
    capture: false,
    openBrowser: false,
    port: 0,
    wsPort: 0,
    wsHost: '127.0.0.1',
  });

  try {
    const routes = ['/', '/home', '/drawing', '/items', '/camel-radar-config.js', '/images/camel-logo.png'];

    for (const route of routes) {
      const response = await fetch(`${runtime.url}${route}`);
      assert.equal(response.status, 200, route);
    }

    const config = await fetch(`${runtime.url}/camel-radar-config.js`).then((response) => response.text());
    assert.match(config, new RegExp(`"wsPort":${runtime.wsPort}`));
  } finally {
    await runtime.stop();
  }
});

test('WebSocket server broadcasts fixture events with existing payload shape', async () => {
  const runtime = await start({
    capture: false,
    openBrowser: false,
    port: 0,
    wsPort: 0,
    wsHost: '127.0.0.1',
  });
  const client = new WebSocket(`ws://127.0.0.1:${runtime.wsPort}`);

  try {
    await new Promise((resolve, reject) => {
      client.once('open', resolve);
      client.once('error', reject);
    });

    const messagePromise = waitForMessages(client, 2);
    runtime.manager.emit('event', {
      parameters: {
        0: 123,
        252: EventCodes.EventCodes.NewCharacter,
      },
    });

    const messages = await messagePromise;
    const codes = messages.map((message) => message.code);

    assert.deepEqual(codes, ['items', 'event']);
    for (const message of messages) {
      assert.equal(typeof message.dictionary, 'string');
      assert.equal(JSON.parse(message.dictionary).parameters[252], EventCodes.EventCodes.NewCharacter);
    }
  } finally {
    await closeClient(client);
    await runtime.stop();
  }
});

test('Protocol16 deserializer reads parameter tables and object arrays sequentially', () => {
  const type = Protocol16Deserializer.protocol16Type;
  const tableBuffer = Buffer.concat([
    Buffer.from([0x00, 0x02]),
    Buffer.from([0x01, type.Byte, 0x09]),
    Buffer.from([0x02, type.String, 0x00, 0x02]),
    Buffer.from('hi'),
  ]);
  const tableCursor = new BufferCursor(tableBuffer);

  assert.deepEqual(Protocol16Deserializer.deserializeParameterTable(tableCursor), {
    1: 9,
    2: 'hi',
  });
  assert.equal(tableCursor.eof(), true);

  const objectArrayBuffer = Buffer.concat([
    Buffer.from([0x00, 0x02]),
    Buffer.from([type.Byte, 0x07]),
    Buffer.from([type.String, 0x00, 0x02]),
    Buffer.from('ok'),
  ]);
  const objectArrayCursor = new BufferCursor(objectArrayBuffer);

  assert.deepEqual(Protocol16Deserializer.deserializeObjectArray(objectArrayCursor), [7, 'ok']);
  assert.equal(objectArrayCursor.eof(), true);
});

test('Protocol18 deserializer reads current Albion reliable event payloads', () => {
  const moveBytes = Buffer.alloc(17);
  moveBytes.writeFloatLE(12.5, 9);
  moveBytes.writeFloatLE(-7.25, 13);

  const reliable = Buffer.concat([
    Buffer.from([
      0xf3,
      Protocol18Deserializer.messageType.EventData,
      EventCodes.EventCodes.Move,
      0x02,
      0x00,
      Protocol18Deserializer.type.CompressedInt64,
      0x54,
      0x01,
      Protocol18Deserializer.type.ByteArray,
      moveBytes.length,
    ]),
    moveBytes,
  ]);

  const decoded = Protocol18Deserializer.deserializeReliable(reliable);

  assert.equal(decoded.messageType, Protocol18Deserializer.messageType.EventData);
  assert.equal(decoded.code, EventCodes.EventCodes.Move);
  assert.equal(decoded.parameters[0], 42);
  assert.equal(decoded.parameters[252], EventCodes.EventCodes.Move);
  assert.equal(decoded.parameters[4], 12.5);
  assert.equal(decoded.parameters[5], -7.25);
  assert.equal(Buffer.isBuffer(decoded.parameters[1]), true);
});

test('Photon parser emits Protocol18 events with the existing event shape', async () => {
  const manager = new PhotonPacketParser();
  const reliable = Buffer.from([
    0xf3,
    Protocol18Deserializer.messageType.EventData,
    EventCodes.EventCodes.Leave,
    0x01,
    0x00,
    Protocol18Deserializer.type.CompressedInt64,
    0x54,
  ]);
  const command = Buffer.alloc(12);
  command.writeUInt8(6, 0);
  command.writeUInt8(0, 1);
  command.writeUInt8(0, 2);
  command.writeUInt8(0, 3);
  command.writeUInt32BE(12 + reliable.length, 4);
  command.writeUInt32BE(1, 8);

  const header = Buffer.alloc(12);
  header.writeUInt16BE(0, 0);
  header.writeUInt8(0, 2);
  header.writeUInt8(1, 3);

  const packet = Buffer.concat([header, command, reliable]);
  const eventPromise = new Promise((resolve) => manager.once('event', resolve));

  manager.handle(packet);

  const event = await eventPromise;
  assert.equal(event.code, EventCodes.EventCodes.Leave);
  assert.equal(event.parameters[0], 42);
  assert.equal(event.parameters[252], EventCodes.EventCodes.Leave);
});

test('Photon parser ignores malformed UDP payloads without throwing', () => {
  const manager = new PhotonPacketParser();
  let packetCount = 0;

  manager.on('packet', () => {
    packetCount++;
  });

  assert.equal(manager.handle(Buffer.from([0x01, 0x02, 0x03])), false);
  assert.equal(manager.handle(Buffer.alloc(400, 0xff)), false);
  assert.equal(packetCount, 0);
});

test('Photon parser ignores commands with invalid declared lengths', () => {
  const manager = new PhotonPacketParser();
  const command = Buffer.alloc(12);
  command.writeUInt8(6, 0);
  command.writeUInt32BE(0xffff, 4);

  const header = Buffer.alloc(12);
  header.writeUInt16BE(0, 0);
  header.writeUInt8(0, 2);
  header.writeUInt8(1, 3);

  assert.equal(manager.handle(Buffer.concat([header, command])), false);
});
