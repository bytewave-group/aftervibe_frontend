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
        api: "https://api.after-vibe.com",
        appApi: "https://api.after-vibe.com",
        displayApi: "https://api.after-vibe.com/animations/display",
        websocket: "wss://client.after-vibe.com/ws",
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
        barId: null,
    };

console.log(
    `[ELECTRON] ${config.name} | API: ${config.api} | WS: ${config.websocket}`
);

module.exports = config;