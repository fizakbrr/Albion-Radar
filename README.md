# Camel Radar - Albion Online Radar Overlay and Map Utility

Camel Radar is a local Albion Online radar and map utility for research, debugging, and desktop overlay experiments. It combines a React interface with an Express and WebSocket runtime to display Albion Online-related map, player, resource, chest, dungeon, fishing, and mist objective data when supported by the available local packet stream.

The project is built as an open source game tool for developers who want to study Albion Online tools, local telemetry visualization, packet parsing workflows, and browser-based desktop utility interfaces. It can run in a no-capture mode for UI development or with optional local packet capture when the required native dependencies are available.

## Key Features

- Local Albion Online radar interface with a browser-based desktop utility UI.
- Albion map tool views for map background, grid, local player marker, and overlay layers.
- Resource, living resource, mob, chest, dungeon, fishing, and mist objective handlers.
- Player list and equipment display when compatible data is available.
- Express HTTP server with WebSocket streaming for real-time local updates.
- React, Vite, Tailwind CSS, and shadcn-style UI components.
- TypeScript build pipeline for the frontend, legacy runtime scripts, server, and tests.
- Optional packet capture support through Npcap and the native `cap` package.
- No-capture mode for development, demos, and UI testing without live Albion Online traffic.

## Tech Stack

- TypeScript
- React
- Vite
- Tailwind CSS
- shadcn UI components
- Express
- WebSocket
- Node.js
- Npcap and `cap` for optional local packet capture
- Node test runner

## Requirements

- Windows 10/11
- Node.js `20.20.2` or newer
- npm `10.8.0` or newer

For live packet capture only:

- Npcap installed
- Visual Studio C++ build tools
- Administrator terminal
- Albion Online traffic on UDP port `5056`

The React UI, static routes, WebSocket tests, and parser fixture tests can run without packet capture.

## Installation

```powershell
git clone https://github.com/fizakbrr/CamelRadar.git
cd CamelRadar
npm ci
```

The native `cap` package is optional. If it cannot build on your machine, Camel Radar can still run as an Albion Online utility in no-capture mode.

## Usage

Run the Albion Online overlay UI without packet capture:

```powershell
npm run start:no-capture
```

Open:

```text
http://localhost:5001
```

Run with live local packet capture:

```powershell
npm start
```

On the first live-capture run, choose the network adapter used by Albion Online. The selected adapter IP is saved to `ip.txt`, which is ignored by git.

You can also pass the adapter directly:

```powershell
$env:CAMEL_RADAR_ADAPTER_IP = "192.168.1.25"
npm start
```

## Development Commands

Build the complete project:

```powershell
npm run build
```

Run the compiled Express backend after a build:

```powershell
npm run serve
```

Run the Vite frontend server for frontend iteration:

```powershell
npm run dev
```

Run tests:

```powershell
npm test
```

The test command builds the React frontend, compiles the TypeScript runtime and server, starts the server with capture disabled, verifies key UI/static/config routes, checks WebSocket payload shape, and exercises parser fixture buffers.

Windows helper scripts are available in `bin/`:

- `bin/install.bat`: runs `npm ci`
- `bin/start.bat`: runs `npm start`

## Configuration

Environment variables:

- `PORT`: HTTP UI port, default `5001`
- `WS_PORT`: WebSocket port, default `5002`
- `WS_HOST`: WebSocket host, default `localhost`
- `CAMEL_RADAR_CAPTURE`: `1` to attempt packet capture, `0` to disable it
- `CAMEL_RADAR_ADAPTER_IP`: IPv4 address of the capture adapter
- `CAMEL_RADAR_OPEN_BROWSER`: `1` to open the browser after start, `0` to skip it

Example:

```powershell
$env:PORT = "5101"
$env:WS_PORT = "5102"
$env:CAMEL_RADAR_CAPTURE = "0"
npm run serve
```

## Project Structure

```text
.
|-- server/                   # Express server, WebSocket server, adapter selection, and capture startup
|-- src/                      # React, Vite, Tailwind, and shadcn UI frontend
|-- scripts/
|   |-- Handlers/             # Albion Online entity, resource, map, player, and objective handlers
|   |-- Drawings/             # Canvas drawing helpers for radar and map overlays
|   |-- Utils/                # Runtime settings, event codes, WebSocket config, and browser entrypoints
|   |-- classes/              # Photon packet parser and protocol deserializers
|   `-- enumerations/         # Protocol type mappings
|-- tools/                    # Build-time asset copy utilities
|-- tests/                    # Node test runner coverage for server, WebSocket, parser, and resource data
|-- bin/                      # Optional Windows helper scripts
|-- images/                   # Local image assets used by the UI and overlay runtime
|-- sounds/                   # Audio assets used by radar alerts
|-- config/                   # Local runtime configuration, ignored by git
|-- tsconfig*.json            # TypeScript project configs
`-- package.json              # npm scripts, dependencies, and package metadata
```

Generated build output is written to `dist/`, `dist-runtime/`, `dist-server/`, and `dist-config/`.

## Troubleshooting

### UI starts but live data is empty

Confirm:

- Albion Online is running and connected to the world.
- The adapter IP in `ip.txt` matches the network adapter carrying Albion Online traffic.
- `CAMEL_RADAR_CAPTURE` is not set to `0`.
- No old Node process is occupying `5001` or `5002`.
- Npcap and the native `cap` package are installed correctly.

### Packet capture is unavailable

Use no-capture mode while you fix native dependencies:

```powershell
npm run start:no-capture
```

Then verify the native capture module:

```powershell
node -e "const { Cap } = require('cap'); console.log(Cap.deviceList())"
```

### Radar page opens but shows no player dots

Current Albion Online traffic can omit or protect exact live player coordinates. Camel Radar can still show supported identity, equipment, or entity data when packets are available, but it cannot draw exact dots without usable position data.

### TypeScript errors remain visible in the editor

Run `TypeScript: Restart TS Server` in VS Code. The repository uses separate TypeScript configs for the React app, legacy browser runtime, server runtime, and scripts folder.

## GitHub Topics

Suggested GitHub repository topics to add manually:

- `albion-online`
- `albion-radar`
- `albion-online-radar`
- `albion-online-tools`
- `albion-online-utility`
- `albion-online-overlay`
- `albion-map-tool`
- `game-utility`
- `desktop-utility`
- `open-source-game-tool`
- `typescript`
- `react`
- `websocket`
- `express`

## Disclaimer

This project is provided for educational and research purposes only. Use it responsibly and respect the terms of service of any software, platform, or game it interacts with. The maintainers are not responsible for misuse, account penalties, or violations of third-party rules.

## Credits

Camel Radar is maintained by fizakbrr.

Original project work by Zeldruck. Additional upstream radar work by FashionFlora, legacy packet parsing work from `photon-packet-parser`, and Protocol 18 behavior cross-checked against AutoDruid's photon parser.

## License

This project is licensed under the ISC License. See the `license` field in `package.json`.
