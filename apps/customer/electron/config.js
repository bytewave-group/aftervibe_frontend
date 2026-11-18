const { app } = require("electron");
const tls = require("tls");

const defaultCerts = tls.getCACertificates("default");
const systemCerts = tls.getCACertificates("system");

tls.setDefaultCACertificates([...defaultCerts, ...systemCerts]);

const isLive =
    app.isPackaged ||
    process.argv.includes("--live");

const config = isLive
    ? {
        name: "LIVE",
        api: "https://voxxclub.vip/api",
        appApi: "https://voxxclub.vip/api",
        displayApi: "https://voxxclub.vip/api/animations/display",
        websocket: "wss://voxxclub.vip/ws",
        // TODO(prod URL): set to the deployed Next.js web, e.g. "https://<web-host>/display/rank".
        // Not known yet (web/ is not deployed); null = use AFTERVIBE_RANK_OVERLAY_URL / resolume-map.json
        rankOverlayUrl: "https://customer.voxxclub.vip/display/rank/",
        barId: null,
    }
    : {
        name: "LOCAL",
        // api: "https://after_vibe_system.test",
        // appApi: "https://after_vibe_system.test/api",
        // displayApi: "https://after_vibe_system.test/api/animations/display",
        api: "https://aftervibe_backend.test",
        appApi: "https://aftervibe_backend.test/api",
        displayApi: "https://aftervibe_backend.test/api/animations/display",
        websocket: "ws://127.0.0.1:8080",
        // Rank overlay page served by the Next.js web dev server (web/src/app/display/rank).
        rankOverlayUrl: "http://localhost:3000/display/rank",
        barId: null,
    };

console.log(
    `[ELECTRON] ${config.name} | API: ${config.api} | WS: ${config.websocket}`
);

module.exports = config;