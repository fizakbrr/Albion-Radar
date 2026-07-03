const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const express = require('express');
const WebSocket = require('ws');

const PhotonParser = require('../scripts/classes/PhotonPacketParser');
const EventCodes = require('../scripts/Utils/EventCodes');

const DEFAULT_HTTP_PORT = 5001;
const DEFAULT_WS_PORT = 5002;
const DEFAULT_WS_HOST = 'localhost';
const CAPTURE_FILTER = 'udp and (dst port 5056 or src port 5056)';
const BRAND_NAME = 'Camel Radar';

function resolveProjectRoot() {
  if (path.basename(__dirname) === 'server' && path.basename(path.dirname(__dirname)) === 'dist-server') {
    return path.resolve(__dirname, '..', '..');
  }

  return path.basename(__dirname) === 'dist-server' ? path.resolve(__dirname, '..') : path.resolve(__dirname, '..');
}

function resolveScriptsDir(rootDir, providedScriptsDir = undefined) {
  if (providedScriptsDir) return providedScriptsDir;

  const compiledScriptsDir = path.join(rootDir, 'dist-runtime', 'scripts');
  return fs.existsSync(compiledScriptsDir) ? compiledScriptsDir : path.join(rootDir, 'scripts');
}

function readOptionOrEnv(optionValue, primaryEnv, legacyEnv = undefined) {
  if (optionValue !== undefined && optionValue !== null) return optionValue;
  if (process.env[primaryEnv] !== undefined) return process.env[primaryEnv];
  return legacyEnv ? process.env[legacyEnv] : undefined;
}

function ensureBigIntJSON() {
  if (!(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function toJSON() {
      return this.toString();
    };
  }
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function normalizePort(value, defaultPort) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535 ? parsed : defaultPort;
}

function createApp(options: any = {}) {
  const rootDir = options.rootDir || resolveProjectRoot();
  const scriptsDir = resolveScriptsDir(rootDir, options.scriptsDir);
  const getWsPort = options.getWsPort || (() => options.wsPort || DEFAULT_WS_PORT);
  const wsHost = options.wsHost || DEFAULT_WS_HOST;
  const frontendDist = path.join(rootDir, 'dist');
  const frontendIndex = path.join(frontendDist, 'index.html');
  const hasFrontendBuild = fs.existsSync(frontendIndex);
  const app = express();

  const sendClientConfig = (req, res) => {
    const config = {
      brandName: BRAND_NAME,
      wsHost,
      wsPort: getWsPort(),
    };

    res
      .type('application/javascript')
      .send([
        `window.CAMEL_RADAR_CONFIG = ${JSON.stringify(config)};`,
        '',
      ].join('\n'));
  };

  app.get('/camel-radar-config.js', sendClientConfig);
  app.get('/favicon.ico', (req, res) => {
    res.type('image/png').sendFile(path.join(rootDir, 'images', 'camel-logo.png'));
  });

  app.use('/scripts', express.static(scriptsDir));
  app.use('/images', express.static(path.join(rootDir, 'images')));
  app.use('/images/Resources', express.static(path.join(rootDir, 'images', 'Resources')));
  app.use('/images/Maps', express.static(path.join(rootDir, 'images', 'Maps')));
  app.use('/images/Items', express.static(path.join(rootDir, 'images', 'Items')));
  app.use('/images/Flags', express.static(path.join(rootDir, 'images', 'Flags')));
  app.use('/sounds', express.static(path.join(rootDir, 'sounds')));
  app.use('/config', express.static(path.join(rootDir, 'config')));

  if (hasFrontendBuild) {
    app.use(express.static(frontendDist, { index: false }));
  }

  const sendFrontend = (res, statusCode = 200) => {
    if (!hasFrontendBuild) {
      res
        .status(503)
        .type('text/plain')
        .send('Camel Radar frontend is not built. Run `npm run build` before starting the server.');
      return;
    }

    res.status(statusCode).sendFile(frontendIndex);
  };

  const frontendRoutes = [
    '/',
    '/home',
    '/resources',
    '/enemies',
    '/chests',
    '/ignorelist',
    '/settings',
    '/map',
    '/drawing',
    '/items',
  ];

  app.get(frontendRoutes, (req, res) => {
    sendFrontend(res);
  });

  app.use((req, res) => {
    const isStaticRequest = ['/scripts', '/images', '/sounds', '/config', '/assets'].some((prefix) => req.path.startsWith(prefix));
    if (isStaticRequest || !req.accepts('html')) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }

    sendFrontend(res, 404);
  });

  app.use((error, req, res, next) => {
    console.error('[http] Request failed:', error);

    if (res.headersSent) {
      next(error);
      return;
    }

    if (req.accepts('html')) {
      sendFrontend(res, 500);
      return;
    }

    res.status(500).json({
      error: error && error.message ? error.message : 'Unexpected server error',
    });
  });

  return app;
}

function sendToClients(server, payload) {
  const message = JSON.stringify(payload);

  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function createWebSocketServer(manager, options: any = {}) {
  const wsHost = options.wsHost || DEFAULT_WS_HOST;
  const wsPort = normalizePort(options.wsPort, DEFAULT_WS_PORT);
  const server = new WebSocket.Server({ port: wsPort, host: wsHost });

  server.on('listening', () => {
    manager.on('event', (dictionary) => {
      const eventCode = dictionary && dictionary.parameters ? dictionary.parameters[252] : undefined;

      if (
        eventCode === EventCodes.EventCodes.NewCharacter ||
        eventCode === EventCodes.EventCodes.Leave ||
        eventCode === EventCodes.EventCodes.CharacterEquipmentChanged
      ) {
        sendToClients(server, { code: 'items', dictionary: JSON.stringify(dictionary) });
      }

      sendToClients(server, { code: 'event', dictionary: JSON.stringify(dictionary) });
    });

    manager.on('request', (dictionary) => {
      sendToClients(server, { code: 'request', dictionary: JSON.stringify(dictionary) });
    });

    manager.on('response', (dictionary) => {
      sendToClients(server, { code: 'response', dictionary: JSON.stringify(dictionary) });
    });
  });

  server.on('close', () => {
    manager.removeAllListeners();
  });

  return server;
}

function readCachedAdapterIp(rootDir) {
  const ipFile = path.join(rootDir, 'ip.txt');
  if (!fs.existsSync(ipFile)) return undefined;

  const adapterIp = fs.readFileSync(ipFile, { encoding: 'utf-8', flag: 'r' }).trim();
  return adapterIp || undefined;
}

async function selectAdapterIp(rootDir, providedIp, options: any = {}) {
  if (providedIp) return providedIp;

  const cachedIp = options.ignoreCache ? undefined : readCachedAdapterIp(rootDir);
  if (cachedIp) {
    console.log();
    console.log(`Using last adapter selected - ${cachedIp}`);
    console.log('If you want to change adapter, delete the "ip.txt" file.');
    console.log();
    return cachedIp;
  }

  const { getAdapterIp } = require('./adapter-selector');
  return getAdapterIp({ ipFile: path.join(rootDir, 'ip.txt') });
}

async function startPacketCapture(manager, options: any = {}) {
  const rootDir = options.rootDir || resolveProjectRoot();
  const adapterIpFromEnv = readOptionOrEnv(
    options.adapterIp,
    'CAMEL_RADAR_ADAPTER_IP',
  );
  const allowAdapterPrompt = options.allowAdapterPrompt !== false && process.stdin.isTTY;
  let capModule;

  try {
    capModule = require('cap');
  } catch (error) {
    console.warn('[capture] Packet capture is unavailable because optional dependency "cap" is not installed or failed to load.');
    console.warn('[capture] Run `npm start` again after installing Npcap and Windows C++ build tools, or use `npm run start:no-capture`.');
    return { enabled: false, reason: 'cap-unavailable', error };
  }

  const { Cap, decoders } = capModule;
  const cap = new Cap();
  let adapterIp = adapterIpFromEnv;

  if (!adapterIp) {
    adapterIp = readCachedAdapterIp(rootDir);
  }

  if (!adapterIp && allowAdapterPrompt) {
    const { getAdapterIp } = require('./adapter-selector');
    adapterIp = await getAdapterIp({ ipFile: path.join(rootDir, 'ip.txt') });
  }

  if (!adapterIp) {
    console.warn('[capture] No adapter IP was provided. Set CAMEL_RADAR_ADAPTER_IP or run interactively once to choose an adapter.');
    return { enabled: false, reason: 'adapter-missing' };
  }

  let device = Cap.findDevice(adapterIp);

  if (!device && !adapterIpFromEnv && allowAdapterPrompt) {
    console.log();
    console.log('Last adapter is not working, please choose a new one.');
    console.log();
    adapterIp = await selectAdapterIp(rootDir, undefined, { ignoreCache: true });
    device = Cap.findDevice(adapterIp);
  }

  if (!device) {
    console.warn(`[capture] No packet capture device matched adapter IP "${adapterIp}".`);
    return { enabled: false, reason: 'device-missing', adapterIp };
  }

  const buffer = Buffer.alloc(65535);

  try {
    cap.open(device, CAPTURE_FILTER, buffer.length, buffer);
    cap.setMinBytes && cap.setMinBytes(0);
  } catch (error) {
    console.warn('[capture] Failed to open packet capture. Run as Administrator and confirm Npcap is installed.');
    console.warn(`[capture] ${error.message}`);
    return { enabled: false, reason: 'open-failed', adapterIp, device, error };
  }

  cap.on('packet', (nbytes) => {
    try {
      const ethernet = decoders.Ethernet(buffer);
      const ip = decoders.IPV4(buffer, ethernet.offset);
      const udp = decoders.UDP(buffer, ip.offset);
      const payload = buffer.slice(udp.offset, nbytes);
      manager.handle(payload);
    } catch (error) {
      console.error('[capture] Error processing packet payload:', error);
    }
  });

  console.log(`[capture] Listening on ${adapterIp} with filter "${CAPTURE_FILTER}".`);
  return { enabled: true, adapterIp, device, cap };
}

function waitForListening(server) {
  if (server.listening) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const onListening = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      server.off('listening', onListening);
      server.off('error', onError);
    };

    server.once('listening', onListening);
    server.once('error', onError);
  });
}

function closeServer(server) {
  return new Promise<void>((resolve, reject) => {
    if (!server || typeof server.close !== 'function') {
      resolve();
      return;
    }

    const hasAddress = typeof server.address === 'function' && server.address();
    if (!server.listening && !hasAddress) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function stopRuntime(runtime) {
  if (!runtime) return;

  if (runtime.capture && runtime.capture.cap && typeof runtime.capture.cap.close === 'function') {
    runtime.capture.cap.close();
  }

  if (runtime.wsServer) {
    runtime.wsServer.clients.forEach((client) => client.close());
  }

  await closeServer(runtime.wsServer);
  await closeServer(runtime.httpServer);
}

async function start(options: any = {}) {
  ensureBigIntJSON();

  const rootDir = options.rootDir || resolveProjectRoot();
  const port = normalizePort(options.port ?? process.env.PORT, DEFAULT_HTTP_PORT);
  const wsPort = normalizePort(options.wsPort ?? process.env.WS_PORT, DEFAULT_WS_PORT);
  const wsHost = options.wsHost || process.env.WS_HOST || DEFAULT_WS_HOST;
  const openBrowser = parseBoolean(
    readOptionOrEnv(options.openBrowser, 'CAMEL_RADAR_OPEN_BROWSER'),
    true,
  );
  const captureEnabled = parseBoolean(
    readOptionOrEnv(options.capture, 'CAMEL_RADAR_CAPTURE'),
    true,
  );
  const manager = options.manager || new PhotonParser();
  let wsServer;

  const app = createApp({
    rootDir,
    wsHost,
    wsPort,
    getWsPort: () => {
      const address = wsServer && wsServer.address();
      return address && typeof address === 'object' ? address.port : wsPort;
    },
  });

  wsServer = createWebSocketServer(manager, { wsHost, wsPort });
  await waitForListening(wsServer);

  const httpServer = app.listen(port, wsHost);
  await waitForListening(httpServer);

  const httpAddress = httpServer.address();
  const resolvedPort = httpAddress && typeof httpAddress === 'object' ? httpAddress.port : port;
  const url = `http://${wsHost}:${resolvedPort}`;

  console.log(`Server is running on ${url}`);
  console.log(`WebSocket server is running on ws://${wsHost}:${wsServer.address().port}`);

  const capture = captureEnabled
    ? await startPacketCapture(manager, {
        rootDir,
        adapterIp: options.adapterIp,
        allowAdapterPrompt: options.allowAdapterPrompt,
      })
    : { enabled: false, reason: 'disabled' };

  if (!capture.enabled) {
    console.warn(`[capture] Running without live packet capture (${capture.reason}).`);
  }

  if (openBrowser) {
    childProcess.exec(`cmd /c start "" "${url}"`, (error) => {
      if (error) {
        console.warn(`[browser] Could not open ${url}: ${error.message}`);
      }
    });
  }

  return {
    app,
    manager,
    httpServer,
    wsServer,
    capture,
    port: resolvedPort,
    wsPort: wsServer.address().port,
    url,
    stop: () => stopRuntime({ httpServer, wsServer, capture }),
  };
}

if (require.main === module) {
  // ponytail: log-and-continue; a lost event beats a dead radar session.
  process.on('uncaughtException', (error) => {
    console.error('[fatal] Uncaught exception:', error);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[fatal] Unhandled rejection:', reason);
  });

  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  createApp,
  createWebSocketServer,
  ensureBigIntJSON,
  normalizePort,
  parseBoolean,
  start,
  startPacketCapture,
  stopRuntime,
};

export {};
