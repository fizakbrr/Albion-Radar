# Camel Radar

Camel Radar is a local Albion Online radar interface with an Express/WebSocket backend and a React, Tailwind, and shadcn UI frontend. It can run as a no-capture local UI or, when the optional native capture dependency is available, listen to Albion Online UDP traffic through Npcap.

## Requirements

- Windows 10/11
- Node.js `20.20.2` or newer
- npm `10.8.0` or newer
- For live packet capture only:
  - Npcap installed
  - Visual Studio C++ build tools
  - Administrator terminal
  - Albion Online traffic on UDP port `5056`

The React UI and automated tests can run without packet capture.

## Install

```powershell
git clone https://github.com/fizakbrr/CamelRadar.git
cd CamelRadar
npm ci
```

The native `cap` package is optional. If it cannot build on your machine, the app can still run in no-capture mode.

## Run

Run the UI without packet capture:

```powershell
npm run start:no-capture
```

Open:

```text
http://localhost:5001
```

Run with live packet capture:

```powershell
npm start
```

On first live-capture run, choose the network adapter used by Albion Online. The selected adapter IP is saved to `ip.txt`, which is ignored by git.

You can also pass the adapter directly:

```powershell
$env:CAMEL_RADAR_ADAPTER_IP = "192.168.1.25"
npm start
```

## Development

Build the React frontend:

```powershell
npm run build
```

Run only the Express backend after a build:

```powershell
npm run serve
```

Run the Vite frontend server for frontend iteration:

```powershell
npm run dev
```

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

## Test

```powershell
npm test
```

The test command builds the React frontend, starts the server with capture disabled, verifies key UI/static/config routes, checks WebSocket payload shape, and exercises parser fixture buffers.

## Frontend

- React + Vite owns all visible UI routes.
- Tailwind CSS v4 provides styling.
- shadcn components are used for app controls, cards, forms, tables, dialogs, sheets, tabs, alerts, badges, switches, checkboxes, inputs, selects, tooltips, and scroll areas.
- The Camel logo is served from `images/camel-logo.png`.

## Troubleshooting

### UI starts but live data is empty

Confirm:

- Albion Online is running and connected to the world.
- The adapter IP in `ip.txt` matches the network adapter carrying Albion traffic.
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

Current Albion traffic can omit or encrypt exact live player coordinates. Camel Radar can still alert/list detected players when identity packets arrive, but it cannot honestly draw exact dots without usable position data.

## Credits

Camel Radar is maintained by me.

Original project work by Zeldruck. Additional upstream radar work by FashionFlora, legacy packet parsing work from `photon-packet-parser`, and Protocol 18 behavior cross-checked against AutoDruid's photon parser.
