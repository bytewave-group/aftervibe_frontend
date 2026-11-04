const { BrowserWindow, app } = require("electron");
const WebSocket = require("ws");
const http = require("http");
const https = require("https");
const path = require("path");
const config = require("./config");
const fs = require("fs");

let sideWindow;
let ws;
let reconnectTimer = null;
let reconnectDelay = 2000;

function createSideWindow() {
    sideWindow = new BrowserWindow({
        title: "AfterVibe Side",
        width: 640,
        height: 360,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload-side.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        }
    });

    const isDev = !app.isPackaged;
    if (isDev) {
        const isLive = process.argv.includes("--live");
        const env = isLive ? "live" : "local";
        sideWindow.loadURL(`http://localhost:5173/#/sidescreen?env=${env}`);
    } else {
        sideWindow.loadFile(
            path.join(__dirname, "../dist/index.html"),
            { hash: "/sidescreen?env=live" }
        );
    }

    sideWindow.setBounds({
        x: 20,
        y: 420,
        width: 640,
        height: 360,
    });

    // Dev tools (uncomment for debugging)
    // sideWindow.webContents.openDevTools({ mode: "detach" });

    sideWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
        console.error("========== SIDE LOAD FAILED ==========");
        console.error("ERROR CODE =", errorCode);
        console.error("ERROR =", errorDescription);
        console.error("URL =", validatedURL);
    });
}

function sendScreensToSide(screens, mode, playlistId, duration) {
    if (!Array.isArray(screens) || screens.length === 0) {
        console.log(`${config.name}: No screens`);
        return;
    }

    console.log("========== SIDE SCREEN DATA ==========");
    console.log("ALL SCREENS =", screens);

    // Side display
    const screen = screens.find(
        x =>
            x.display_name?.toLowerCase() === "side screen" ||
            x.name?.toLowerCase() === "side screen"
    );

    if (!screen) {
        console.log(`${config.name}: Side display not found`);
        return;
    }

    console.log("SIDE DISPLAY =", screen);
    console.log("SIDE ANIMATIONS =", screen.animations);

    sideWindow.webContents.send("play-layout", {
        displays: [screen],
        mode: mode || "default",
        playlist_id: playlistId || null,
        isMain: false,
        duration: duration,
    });
}

function getBarToken() {
    const configPath = path.join(app.getPath("userData"), "bar-config.json");
    try {
        const data = JSON.parse(
            require("fs").readFileSync(configPath, "utf8")
        );
        return data.bar_token || null;
    } catch (error) {
        console.error("Failed to read Bar token:", error);
        return null;
    }
}

function loadDefault(barId) {
    console.log(`========== GET ${config.name} SIDE API ==========`);

    const token = getBarToken();

    if (!token) {
        console.error("SIDE BAR TOKEN NOT FOUND");
        return;
    }

    const url = `${config.displayApi}?bar_id=${barId}`;
    const client = url.startsWith("https") ? https : http;

    const req = client.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        (res) => {
            console.log(`${config.name} SIDE API STATUS = ${res.statusCode}`);

            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                console.log(
                    `========== ${config.name} SIDE API RESPONSE ==========`
                );
                console.log(body);

                let data;

                try {
                    data = JSON.parse(body);
                } catch (e) {
                    console.error(`${config.name} SIDE INVALID JSON:`);
                    console.error(body);
                    return;
                }

                if (!data.displays || !data.displays.length) {
                    console.error(`${config.name} SIDE API: No displays`);
                    return;
                }
                
                sendScreensToSide(
                    data.displays,
                    data.mode || "default",
                    data.playlist_id || null, 
                    data.duration
                );
            });
        }
    );

    req.on("error", (err) => {
        console.error(`${config.name} SIDE API ERROR =`, err);
    });
}

function connectWebSocket() {
    if (
        ws &&
        (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
    ) {
        return;
    }

    console.log(`========== CONNECT ${config.name} WEBSOCKET ==========`);

    ws = new WebSocket(config.websocket);

    ws.on("open", () => {
        console.log(`${config.name} WEBSOCKET CONNECTED`);
        reconnectDelay = 2000;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        // Tell server that Side has reconnected
        ws.send(JSON.stringify({
            type: "reconnect",
            playlistId: null
        }));

        console.log("SIDE RECONNECT STATE SENT");
    });

    ws.on("message", (message) => {
        console.log(`========== ${config.name} SIDE WS MESSAGE ==========`); 
        console.log(message.toString());
        try {
            const data = JSON.parse(message);

            if (data.type === "play-layout") {
                console.log(`PLAY ${config.name} SIDE SCREEN`);
                console.log("SIDE MODE =", data.mode);
                console.log("SIDE SCREENS =", data.screens);
            
                sendScreensToSide(
                    data.screens,
                    data.mode,
                    data.playlistId, 
                    data.duration
                );
            }
        } catch (err) {
            console.error(`[${config.name} SIDE WS JSON ERROR] ${err.message}`);
        }
    });

    ws.on("close", () => {
        console.log(`${config.name} WEBSOCKET DISCONNECTED`);
        scheduleReconnect();
    });

    ws.on("error", (err) => {
        console.error(`${config.name} WEBSOCKET ERROR =`, err.message);
    });
}

function scheduleReconnect() {
    if (reconnectTimer) return;

    console.log(`${config.name} WEBSOCKET RECONNECT IN ${reconnectDelay}ms`);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectWebSocket();
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
    }, reconnectDelay);
}

function startSide(barId) {
    console.log("SIDE BAR ID =", barId);
    createSideWindow();

    sideWindow.webContents.setBackgroundThrottling(false);

    sideWindow.webContents.once("did-finish-load", () => {
        console.log("========== ELECTRON SIDE SCREEN LOADED ==========");
        loadDefault(barId);
        connectWebSocket();
    });
}

module.exports = {
    startSide
};