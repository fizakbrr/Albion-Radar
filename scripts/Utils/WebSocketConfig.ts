export function getRadarWebSocketUrl() {
  const config = (window as any).CAMEL_RADAR_CONFIG || {};
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = config.wsHost || window.location.hostname || 'localhost';
    const safeHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
    const port = config.wsPort || 5002;

    return `${protocol}//${safeHost}:${port}`;
}
