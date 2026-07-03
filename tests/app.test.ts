import { MobsDrawing } from '../scripts/Drawings/MobsDrawing';
import { EnemyType, MobsHandler } from '../scripts/Handlers/MobsHandler';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const BufferCursor = require('buffercursor');
const WebSocket = require('ws');

const { start } = require('../server/index');
const Protocol16Deserializer = require('../scripts/classes/Protocol16Deserializer');
const Protocol18Deserializer = require('../scripts/classes/Protocol18Deserializer');
const PhotonPacketParser = require('../scripts/classes/PhotonPacketParser');
const EventCodes = require('../scripts/Utils/EventCodes');

function stripBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function readActiveLivingResourceEntries() {
  const mobsInfoPath = path.join(process.cwd(), 'scripts', 'Handlers', 'MobsInfo.ts');
  const source = stripBlockComments(fs.readFileSync(mobsInfoPath, 'utf8'));
  const addItemPattern =
    /this\.addItem\((\d+),\s*(\d+),\s*EnemyType\.(LivingHarvestable|LivingSkinnable),\s*"([^"]*)"\)/g;
  const entries = [];
  let match;

  while ((match = addItemPattern.exec(source)) !== null) {
    entries.push({
      id: Number(match[1]),
      tier: Number(match[2]),
      type: match[3],
      resource: match[4],
    });
  }

  return entries;
}

function createEnchantMatrix(defaultValue = false) {
  return {
    e0: Array(8).fill(defaultValue),
    e1: Array(8).fill(defaultValue),
    e2: Array(8).fill(defaultValue),
    e3: Array(8).fill(defaultValue),
    e4: Array(8).fill(defaultValue),
  };
}

function enableTier(matrix, tier, enchant = 0) {
  matrix[`e${enchant}`][tier - 1] = true;
}

function createMobSettings() {
  return {
    harvestingStaticFiber: createEnchantMatrix(),
    harvestingStaticHide: createEnchantMatrix(),
    harvestingStaticWood: createEnchantMatrix(),
    harvestingStaticOre: createEnchantMatrix(),
    harvestingStaticRock: createEnchantMatrix(),
    harvestingLivingFiber: createEnchantMatrix(),
    harvestingLivingHide: createEnchantMatrix(),
    harvestingLivingWood: createEnchantMatrix(),
    harvestingLivingOre: createEnchantMatrix(),
    harvestingLivingRock: createEnchantMatrix(),
    enemyLevels: [true, true, true, true, true],
    showMinimumHealthEnemies: false,
    minimumHealthEnemies: 0,
    avaloneDrones: true,
    showUnmanagedEnemies: true,
    showEventEnemies: true,
    bossCrystalSpider: true,
    bossFairyDragon: true,
    bossVeilWeaver: true,
    bossGriffin: true,
  };
}

function createNewMobParameters({ id, typeId, x = 10, y = 20, health = 100, enchant = 0, name = undefined, nameIndex = 32 }) {
  const parameters: any[] = [];

  parameters[0] = id;
  parameters[1] = typeId;
  parameters[7] = [x, y];
  parameters[13] = health;
  parameters[19] = 1;
  parameters[33] = enchant;

  if (name !== undefined)
    parameters[nameIndex] = name;

  return parameters;
}

async function closeClient(client) {
  if (!client || client.readyState === WebSocket.CLOSED) return;

  await new Promise<void>((resolve) => {
    client.once('close', resolve);
    client.close();
  });
}

function waitForMessages(client, count): Promise<any[]> {
  const messages: any[] = [];

  return new Promise<any[]>((resolve, reject) => {
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
    await new Promise<void>((resolve, reject) => {
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
  const eventPromise = new Promise<any>((resolve) => manager.once('event', resolve));

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

test('fragment reassembly evicts stale incomplete sequences and rejects oversized totals', () => {
  const manager = new PhotonPacketParser();
  manager.fragmentTtlMs = -1;

  const makeFragment = (startSequenceNumber, totalLength = 8) => ({
    channelId: 1,
    startSequenceNumber,
    fragmentCount: 2,
    fragmentNumber: 0,
    totalLength,
    fragmentOffset: 0,
    data: Buffer.alloc(4),
  });

  manager.addFragment(makeFragment(1));
  assert.equal(manager.fragments.size, 1);

  manager.addFragment(makeFragment(2));
  assert.equal(manager.fragments.size, 1);
  assert.equal(manager.fragments.has('1:1'), false);

  assert.equal(manager.addFragment(makeFragment(3, manager.maxFragmentTotalLength + 1)), null);
  assert.equal(manager.fragments.size, 0);
});

test('fairy dragon mist boss respects the bossFairyDragon toggle', () => {
  const settings = createMobSettings();
  settings.bossFairyDragon = false;

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    400: [6, EnemyType.MistBoss, 'FAIRYDRAGON'],
  });

  handler.NewMobEvent(createNewMobParameters({ id: 7100, typeId: 400 }));
  assert.equal(handler.mobsList.length, 0);

  settings.bossFairyDragon = true;
  handler.NewMobEvent(createNewMobParameters({ id: 7101, typeId: 400 }));
  assert.equal(handler.mobsList.length, 1);
});

test('mobs with a missing health parameter do not bypass the minimum health filter', () => {
  const settings = createMobSettings();
  settings.showMinimumHealthEnemies = true;
  settings.minimumHealthEnemies = 50;

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    401: [5, EnemyType.Enemy, 'someenemy'],
  });

  const parameters = createNewMobParameters({ id: 7102, typeId: 401 });
  delete parameters[13];

  handler.NewMobEvent(parameters);
  assert.equal(handler.mobsList.length, 0);
});

test('named known living skinnables stay in the mob resource pipeline', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingLivingHide, 4, 0);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    389: [4, EnemyType.LivingSkinnable, 'hide'],
  });

  handler.NewMobEvent(createNewMobParameters({
    id: 7001,
    typeId: 389,
    name: 'T4_MOB_HIDE_FOREST_BOAR',
  }));

  assert.equal(handler.mobsList.length, 1);
  assert.equal(handler.mistList.length, 0);
  assert.equal(handler.mobsList[0].name, 'hide');
  assert.equal(handler.mobsList[0].type, EnemyType.LivingSkinnable);
});

test('static hide filters also show the live hide mob before it becomes a corpse', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingStaticHide, 5, 0);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    390: [5, EnemyType.LivingSkinnable, 'hide'],
  });

  handler.NewMobEvent(createNewMobParameters({
    id: 7020,
    typeId: 390,
    name: 'T5_MOB_TREASURE_TERRORBIRD',
  }));

  assert.equal(handler.harvestablesNotGood.length, 0);
  assert.equal(handler.mobsList.length, 1);
  assert.equal(handler.mobsList[0].tier, 5);
  assert.equal(handler.mobsList[0].name, 'hide');
  assert.equal(handler.mobsList[0].type, EnemyType.LivingSkinnable);
});

test('static resource filters also show matching live non-hide resource mobs', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingStaticWood, 6, 0);
  enableTier(settings.harvestingStaticOre, 4, 0);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    510: [6, EnemyType.LivingHarvestable, 'Logs'],
    538: [4, EnemyType.LivingHarvestable, 'ore'],
  });

  handler.NewMobEvent(createNewMobParameters({ id: 7021, typeId: 510 }));
  handler.NewMobEvent(createNewMobParameters({ id: 7022, typeId: 538 }));

  assert.equal(handler.harvestablesNotGood.length, 0);
  assert.deepEqual(
    handler.mobsList.map((mob) => [mob.id, mob.tier, mob.type, mob.name]),
    [
      [7021, 6, EnemyType.LivingHarvestable, 'Logs'],
      [7022, 4, EnemyType.LivingHarvestable, 'ore'],
    ],
  );
});

test('unknown named mist entrances still go to the mist portal list', () => {
  const handler = new MobsHandler(createMobSettings());

  handler.NewMobEvent(createNewMobParameters({
    id: 7002,
    typeId: 99999,
    enchant: 2,
    name: 'MISTS_SOLO_ENTRANCE',
    nameIndex: 31,
  }));

  assert.equal(handler.mobsList.length, 0);
  assert.equal(handler.mistList.length, 1);
  assert.equal(handler.mistList[0].type, 0);
  assert.equal(handler.mistList[0].enchant, 2);
});

test('hidden living resources keep position updates and promote when enchant filters match', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingLivingWood, 5, 1);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    509: [5, EnemyType.LivingHarvestable, 'Logs'],
  });

  handler.NewMobEvent(createNewMobParameters({ id: 7003, typeId: 509, enchant: 0 }));
  assert.equal(handler.mobsList.length, 0);
  assert.equal(handler.harvestablesNotGood.length, 1);

  handler.updateMobPosition(7003, 50, 60);
  handler.updateEnchantEvent([7003, 1]);

  assert.equal(handler.harvestablesNotGood.length, 0);
  assert.equal(handler.mobsList.length, 1);
  assert.equal(handler.mobsList[0].posX, 50);
  assert.equal(handler.mobsList[0].posY, 60);
  assert.equal(handler.mobsList[0].enchantmentLevel, 1);
});

test('packet names correct stale living resource id mappings before filtering', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingLivingFiber, 5, 0);
  enableTier(settings.harvestingLivingHide, 4, 0);
  enableTier(settings.harvestingLivingOre, 3, 0);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    477: [7, EnemyType.LivingSkinnable, 'hide'],
    382: [8, EnemyType.LivingSkinnable, 'hide'],
    482: [8, EnemyType.LivingHarvestable, 'ore'],
  });

  handler.NewMobEvent(createNewMobParameters({
    id: 7010,
    typeId: 477,
    name: 'T5_MOB_CRITTER_FIBER_SWAMP',
  }));
  handler.NewMobEvent(createNewMobParameters({
    id: 7011,
    typeId: 382,
    name: 'T4_MOB_HIDE_SWAMP_MONITORLIZARD',
  }));
  handler.NewMobEvent(createNewMobParameters({
    id: 7012,
    typeId: 482,
    name: 'T3_MOB_CRITTER_ORE_MOUNTAIN',
  }));

  assert.equal(handler.mobsList.length, 3);
  assert.deepEqual(
    handler.mobsList.map((mob) => [mob.id, mob.tier, mob.type, mob.name]),
    [
      [7010, 5, EnemyType.LivingHarvestable, 'fiber'],
      [7011, 4, EnemyType.LivingSkinnable, 'hide'],
      [7012, 3, EnemyType.LivingHarvestable, 'ore'],
    ],
  );
});

test('living resource packet names are detected outside legacy name fields', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingLivingHide, 5, 0);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    357: [8, EnemyType.MistBoss, 'GRIFFIN'],
  });

  const parameters = createNewMobParameters({
    id: 7015,
    typeId: 357,
    name: undefined,
  });
  parameters[18] = 'T5_MOB_TREASURE_TERRORBIRD';

  handler.NewMobEvent(parameters);

  assert.equal(handler.mistList.length, 0);
  assert.equal(handler.mobsList.length, 1);
  assert.equal(handler.mobsList[0].tier, 5);
  assert.equal(handler.mobsList[0].type, EnemyType.LivingSkinnable);
  assert.equal(handler.mobsList[0].name, 'hide');
});

test('hide animal names from current journal lists classify as skinnable resources', () => {
  const handler = new MobsHandler(createMobSettings());
  const examples = [
    'T2_MOB_FEY_FOX',
    'T3_MOB_FOGLANDS_DOE',
    'T4_MOB_MISTCOUGAR_RUNT',
    'T5_MOB_SABRETOOTH_TIGER',
    'T6_MOB_MOOSE',
    'T6_MOB_OLD_WHITE',
    'T7_MOB_MISTHIDE_MAULER',
    'T8_MOB_REGAL_DRAGONHAWK',
  ];

  assert.deepEqual(
    examples.map((name) => handler.getLivingResourceInfoFromName(name)),
    [
      { tier: 2, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 3, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 4, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 5, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 6, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 6, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 7, type: EnemyType.LivingSkinnable, name: 'hide' },
      { tier: 8, type: EnemyType.LivingSkinnable, name: 'hide' },
    ],
  );
});

test('unmapped living resource packet names can be detected without table ids', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingLivingRock, 6, 2);
  enableTier(settings.harvestingLivingHide, 5, 0);

  const handler = new MobsHandler(settings);

  handler.NewMobEvent(createNewMobParameters({
    id: 7013,
    typeId: 13000,
    enchant: 2,
    name: 'T6_MOB_CRITTER_ROCK_ROADS',
  }));
  handler.NewMobEvent(createNewMobParameters({
    id: 7014,
    typeId: 13001,
    name: 'T5_MOB_TREASURE_TERRORBIRD',
  }));

  assert.equal(handler.mobsList.length, 2);
  assert.equal(handler.harvestablesNotGood.length, 0);
  assert.equal(handler.mobsList[0].tier, 6);
  assert.equal(handler.mobsList[0].type, EnemyType.LivingHarvestable);
  assert.equal(handler.mobsList[0].name, 'rock');
  assert.equal(handler.mobsList[1].tier, 5);
  assert.equal(handler.mobsList[1].type, EnemyType.LivingSkinnable);
  assert.equal(handler.mobsList[1].name, 'hide');
});

test('visible living resources hide again when enchant filters stop matching', () => {
  const settings = createMobSettings();
  enableTier(settings.harvestingLivingOre, 6, 0);

  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    540: [6, EnemyType.LivingHarvestable, 'ore'],
  });

  handler.NewMobEvent(createNewMobParameters({ id: 7004, typeId: 540, enchant: 0 }));
  assert.equal(handler.mobsList.length, 1);

  handler.updateEnchantEvent([7004, 1]);

  assert.equal(handler.mobsList.length, 0);
  assert.equal(handler.harvestablesNotGood.length, 1);
  assert.equal(handler.harvestablesNotGood[0].enchantmentLevel, 1);
});

test('living resources refresh when filters are changed after packets arrive', () => {
  const settings = createMobSettings();
  const handler = new MobsHandler(settings);
  handler.updateMobInfo({
    553: [4, EnemyType.LivingHarvestable, 'fiber'],
  });

  handler.NewMobEvent(createNewMobParameters({ id: 7005, typeId: 553, enchant: 0 }));
  assert.equal(handler.mobsList.length, 0);
  assert.equal(handler.harvestablesNotGood.length, 1);

  enableTier(settings.harvestingLivingFiber, 4, 0);
  handler.refreshLivingResources();

  assert.equal(handler.mobsList.length, 1);
  assert.equal(handler.harvestablesNotGood.length, 0);

  settings.harvestingLivingFiber.e0[3] = false;
  handler.refreshLivingResources();

  assert.equal(handler.mobsList.length, 0);
  assert.equal(handler.harvestablesNotGood.length, 1);
});

test('living resource icon names match shipped resource image filenames', () => {
  const drawing = new MobsDrawing({});

  assert.equal(
    drawing.getLivingResourceImageName({ type: EnemyType.LivingSkinnable, name: 'GIANTSTAG', tier: 4, enchantmentLevel: 2 }),
    'hide_4_2',
  );
  assert.equal(
    drawing.getLivingResourceImageName({ type: EnemyType.LivingHarvestable, name: 'wood', tier: '6', enchantmentLevel: '4' }),
    'Logs_6_4',
  );
  assert.equal(
    drawing.getLivingResourceImageName({ type: EnemyType.LivingHarvestable, name: 'stone', tier: 5, enchantmentLevel: 99 }),
    'rock_5_0',
  );
  assert.equal(
    drawing.getLivingResourceImageName({ type: EnemyType.LivingHarvestable, name: 'unknown', tier: 5, enchantmentLevel: 0 }),
    undefined,
  );
});

test('living resource table has complete active road and mist mappings for every resource type', () => {
  const entries = readActiveLivingResourceEntries();
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const expectedRanges = [
    { label: 'hide mists', resource: 'hide', type: 'LivingSkinnable', start: 330, tiers: [1, 2, 3, 4, 5, 6, 7, 8] },
    { label: 'hide treasure mists', resource: 'hide', type: 'LivingSkinnable', start: 338, tiers: [4, 5, 6, 7, 8] },
    { label: 'hide cougars', resource: 'hide', type: 'LivingSkinnable', start: 493, tiers: [4, 5, 6, 7, 8] },
    { label: 'hide cougars veteran', resource: 'hide', type: 'LivingSkinnable', start: 498, tiers: [4, 5, 6, 7, 8] },
    { label: 'hide cougars elite', resource: 'hide', type: 'LivingSkinnable', start: 503, tiers: [4, 5, 6, 7, 8] },
    { label: 'wood roads', resource: 'Logs', start: 508, tiers: [4, 5, 6, 7, 8] },
    { label: 'wood roads veteran', resource: 'Logs', start: 513, tiers: [4, 5, 6, 7, 8] },
    { label: 'wood roads elite', resource: 'Logs', start: 518, tiers: [4, 5, 6, 7, 8] },
    { label: 'rock roads', resource: 'rock', start: 523, tiers: [4, 5, 6, 7, 8] },
    { label: 'rock roads veteran', resource: 'rock', start: 528, tiers: [4, 5, 6, 7, 8] },
    { label: 'rock roads elite', resource: 'rock', start: 533, tiers: [4, 5, 6, 7, 8] },
    { label: 'ore roads', resource: 'ore', start: 538, tiers: [4, 5, 6, 7, 8] },
    { label: 'ore roads veteran', resource: 'ore', start: 543, tiers: [4, 5, 6, 7, 8] },
    { label: 'ore roads elite', resource: 'ore', start: 548, tiers: [4, 5, 6, 7, 8] },
    { label: 'fiber roads', resource: 'fiber', start: 553, tiers: [4, 5, 6, 7, 8] },
    { label: 'fiber roads veteran', resource: 'fiber', start: 558, tiers: [4, 5, 6, 7, 8] },
    { label: 'fiber roads elite', resource: 'fiber', start: 563, tiers: [4, 5, 6, 7, 8] },
    { label: 'wood mists green', resource: 'Logs', start: 568, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'rock mists green', resource: 'rock', start: 574, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'ore mists green', resource: 'ore', start: 580, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'fiber mists green', resource: 'fiber', start: 586, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'wood mists red', resource: 'Logs', start: 592, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'rock mists red', resource: 'rock', start: 598, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'ore mists red', resource: 'ore', start: 604, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'fiber mists red', resource: 'fiber', start: 610, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'wood mists dead', resource: 'Logs', start: 616, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'rock mists dead', resource: 'rock', start: 622, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'ore mists dead', resource: 'ore', start: 628, tiers: [3, 4, 5, 6, 7, 8] },
    { label: 'fiber mists dead', resource: 'fiber', start: 634, tiers: [3, 4, 5, 6, 7, 8] },
  ];

  for (const { label, resource, type = 'LivingHarvestable', start, tiers } of expectedRanges) {
    tiers.forEach((tier, index) => {
      const id = start + index;
      const entry = entriesById.get(id);

      assert.deepEqual(entry, { id, tier, type, resource }, `${label} id ${id}`);
    });
  }
});

test('living resource IDs do not collide across active mappings', () => {
  const entries = readActiveLivingResourceEntries();
  const seen = new Map();

  for (const entry of entries) {
    assert.equal(seen.has(entry.id), false, `duplicate living resource id ${entry.id}`);
    seen.set(entry.id, entry);
  }
});

export {};
