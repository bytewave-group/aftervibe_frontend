const { BrowserWindow, ipcMain, app, screen } = require("electron");
const WebSocket = require("ws");
const path = require("path");
const config = require("./config");
const fs = require("fs");

let screenWindows = new Map();
let resolumeMode = false;
let resolume = null;
let ws;
let reconnectTimer = null;
let reconnectDelay = 2000;
let pendingQueueFinished = null;
let lastDefaultData = null;

let activePlaybackMode = "default";
let screenContentReady = false;

const DEFAULT_POLL_MS = 60 * 1000;
const RANK_POLL_MS = 60 * 1000;
const SCREEN_POLL_MS = 2 * 60 * 1000;

function createScreenWindow(display) {
    const screenWidth = Number(display.width) || 1920;
    const screenHeight = Number(display.height) || 1080;

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;

    const maxWidth = workArea.width - 40;
    const maxHeight = workArea.height - 40;

    const scale = Math.min(
        maxWidth / screenWidth,
        maxHeight / screenHeight,
        1
    );

    const windowWidth = Math.round(screenWidth * scale);
    const windowHeight = Math.round(screenHeight * scale);

    const window = new BrowserWindow({
        title: `${display.name}`,
        width: windowWidth,
        height: windowHeight,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload-main.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        }
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        const isLive = process.argv.includes("--live");
        const env = isLive ? "live" : "local";

        window.loadURL(
            `http://localhost:5173/#/screen?env=${env}&display_id=${display.id}`
        );
    } else {
        window.loadFile(
            path.join(__dirname, "../dist/index.html"),
            {
                hash: `/screen?env=live&display_id=${display.id}`
            }
        );
    }

    window.setBounds({
        x: 20,
        y: 20,
        width: windowWidth,
        height: windowHeight,
    });

    window.webContents.setBackgroundThrottling(false);

    // Temporary FPS test for the entire Screen
    if (!app.isPackaged) {
        window.webContents.on("did-finish-load", () => {
            window.webContents.executeJavaScript(`
                (() => {
                    if (window.__screenFpsTestRunning) return;
                    window.__screenFpsTestRunning = true;

                    let last = performance.now();
                    let frames = 0;

                    function measureFPS(now) {
                        frames++;

                        if (now - last >= 1000) {
                            console.log(
                                "[SCREEN FPS] Display ${display.id}:",
                                frames
                            );

                            frames = 0;
                            last = now;
                        }

                        requestAnimationFrame(measureFPS);
                    }

                    requestAnimationFrame(measureFPS);
                })();
            `);
        });
    }


    window.webContents.on(
        "did-fail-load",
        (event, errorCode, errorDescription, validatedURL) => {
            console.error("========== SCREEN LOAD FAILED ==========");
            console.error("DISPLAY ID =", display.id);
            console.error("ERROR CODE =", errorCode);
            console.error("ERROR =", errorDescription);
            console.error("URL =", validatedURL);
        }
    );

    window.on("closed", () => {
        screenWindows.delete(display.id);
    
        if (screenWindows.size === 0) {
            app.quit();
        }
    });

    screenWindows.set(display.id, window);

    return window;
}

function getBarToken() {
    const configPath = path.join(app.getPath("userData"), "bar-config.json");

    try {
        const data = JSON.parse(
            fs.readFileSync(configPath, "utf8")
        );

        console.log("BAR TOKEN =", data.bar_token);

        return data.bar_token || null;
    } catch (error) {
        console.error("Failed to read Bar token:", error);
        return null;
    }
}

function getPrimaryDisplayId() {
    if (resolumeMode && resolume) {
        return resolume.getPrimaryDisplayId();
    }

    return [...screenWindows.keys()][0] ?? null;
}

function eachDisplay(callback) {
    if (resolumeMode && resolume) {
        resolume.getDisplayIds().forEach((displayId) => {
            callback(Number(displayId));
        });
        return;
    }

    screenWindows.forEach((window, displayId) => {
        if (!window.isDestroyed()) {
            callback(Number(displayId));
        }
    });
}

function sendToDisplay(displayId, channel, data) {
    if (resolumeMode && resolume) {
        if (channel === "play-layout") {
            resolume.play(Number(displayId), data);
            return;
        }

        resolume.send(Number(displayId), channel, data);
        return;
    }

    const window = screenWindows.get(Number(displayId));

    if (!window || window.isDestroyed()) {
        return;
    }

    window.webContents.send(channel, data);
}

function handleQueueFinished(playlistId) {
    activePlaybackMode = "default";

    console.log("ACTIVE PLAYBACK MODE = default");

    lastDefaultData = null;

    console.log(
        `QUEUE FINISHED FROM RENDERER = ${playlistId}`
    );

    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                type: "queue-finished",
                playlistId
            })
        );

        console.log("QUEUE FINISHED: SENT TO NODE");
    } else {
        console.log(
            `NODE OFFLINE - SAVING QUEUE FINISHED = ${playlistId}`
        );

        pendingQueueFinished = playlistId;
    }
}

function rankDisplayIds() {
    if (resolumeMode && resolume) {
        return resolume.getDisplayIds();
    }

    return [...screenWindows.keys()];
}

function loadRankBoards() {
    loadRankBoard("daily");
    loadRankBoard("weekly");
    loadRankBoard("monthly");
}

function loadAllRankSettings() {
    rankDisplayIds().forEach((displayId) => {
        loadRankBoardSettings(displayId);
    });
}

function publishScreenContent(barId) {
    const send = () => {
        loadDefault(barId);
        loadRankBoards();
        loadAllRankSettings();
        loadScreenSettings();
    };

    send();
    setTimeout(send, 2000);
    screenContentReady = true;
    connectWebSocket();
}

function handleResolumeDisplays(barId, displays) {
    const { addedDisplayIds, pendingWindows } = resolume.syncDisplays(displays);

    const publish = () => {
        if (!screenContentReady) {
            publishScreenContent(barId);
            return;
        }

        if (addedDisplayIds.length > 0) {
            loadDefault(barId, addedDisplayIds);
            loadRankBoards();
            addedDisplayIds.forEach((displayId) => {
                loadRankBoardSettings(displayId);
            });
        }

        connectWebSocket();
    };

    if (pendingWindows.length > 0) {
        resolume.whenLoaded(pendingWindows, () => {
            console.log("========== NEW SCREENS LOADED ==========");
            publish();
        });
        return;
    }

    if (!screenContentReady || addedDisplayIds.length > 0) {
        publish();
    }
}

function loadDisplays(barId) {
    console.log("========== GET ALL DISPLAYS ==========");

    const token = getBarToken();

    if (!token) {
        console.error("BAR TOKEN NOT FOUND");
        return;
    }

    const url = `${config.appApi}/screen/settings`;
    const client = url.startsWith("https")
        ? require("https")
        : require("http");

    console.log("DISPLAY SETTINGS URL =", url);

    console.log("BEFORE HTTP REQUEST");

    const req = client.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        },
        (res) => {
            console.log("HTTP RESPONSE RECEIVED =", res.statusCode);

            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    const data = JSON.parse(body);

                    if (!data.success) {
                        console.error("FAILED TO LOAD DISPLAYS");
                        return;
                    }

                    const displays = data.displays ?? [];

                    console.log("ACTIVE DISPLAYS =", displays);

                    if (data.settings) {
                        sendToAllScreens(
                            "screen-settings-update",
                            data.settings
                        );
                    }

                    if (resolumeMode) {
                        handleResolumeDisplays(barId, displays);
                        return;
                    }

                    const activeDisplayIds = displays.map(d => Number(d.id));

                    // Remove screens that are no longer active
                    screenWindows.forEach((window, displayId) => {

                        if (!activeDisplayIds.includes(Number(displayId))) {

                            console.log(`REMOVE SCREEN DISPLAY`, displayId);

                            if (!window.isDestroyed()) {
                                window.close();
                            }

                            screenWindows.delete(displayId);
                        }
                    });

                    // Create / update screens
                    const newWindows = [];
                    displays.forEach(display => {

                        const displayId = Number(display.id);
                        const existingWindow = screenWindows.get(displayId);

                        if (!existingWindow) {

                            console.log(
                                `CREATE SCREEN DISPLAY ${displayId}`
                            );

                            const newWindow = createScreenWindow(display);

                            newWindows.push(newWindow);

                            return;
                        }

                        if (existingWindow.isDestroyed()) {
                            const newWindow = createScreenWindow(display);
                            newWindows.push(newWindow);
                            return;
                        }

                        // Update window size if Display size changed
                        const screenWidth = Number(display.width) || 1920;
                        const screenHeight = Number(display.height) || 1080;

                        const primaryDisplay = screen.getPrimaryDisplay();
                        const workArea = primaryDisplay.workAreaSize;

                        const maxWidth = workArea.width - 40;
                        const maxHeight = workArea.height - 40;

                        const scale = Math.min(
                            maxWidth / screenWidth,
                            maxHeight / screenHeight,
                            1
                        );

                        const windowWidth = Math.round(screenWidth * scale);
                        const windowHeight = Math.round(screenHeight * scale);

                        const currentBounds = existingWindow.getBounds();

                        if (
                            currentBounds.width !== windowWidth ||
                            currentBounds.height !== windowHeight
                        ) {

                            console.log(
                                `RESIZE SCREEN DISPLAY ${displayId}:`,
                                `${windowWidth}x${windowHeight}`
                            );

                            existingWindow.setBounds({
                                x: currentBounds.x,
                                y: currentBounds.y,
                                width: windowWidth,
                                height: windowHeight,
                            });
                        }
                    });

                    if (newWindows.length > 0) {

                        let loadedCount = 0;

                        newWindows.forEach((window) => {

                            window.webContents.once(
                                "did-finish-load",
                                () => {

                                    loadedCount++;

                                    console.log(
                                        `NEW SCREEN LOADED ${loadedCount}/${newWindows.length}`
                                    );

                                    if (loadedCount === newWindows.length) {

                                        console.log("========== NEW SCREENS LOADED ==========");

                                        const newDisplayIds = newWindows
                                            .map(window =>
                                                [...screenWindows.entries()]
                                                    .find(([, currentWindow]) => currentWindow === window)?.[0]
                                            )
                                            .filter(id => id != null)
                                            .map(Number);

                                        loadDefault(barId, newDisplayIds);
                                        loadRankBoards();

                                        newWindows.forEach((window) => {

                                            const displayId = [...screenWindows.entries()]
                                                .find(([, currentWindow]) => currentWindow === window)?.[0];

                                            if (displayId) {
                                                loadRankBoardSettings(displayId);
                                            }
                                        });

                                        loadScreenSettings();
                                        screenContentReady = true;
                                        connectWebSocket();
                                    }

                                }
                            );
                        });

                    } else if (!screenContentReady && screenWindows.size > 0) {
                        publishScreenContent(barId);
                    }


                } catch (error) {
                    console.error(
                        "DISPLAY SETTINGS JSON ERROR =",
                        error
                    );
                    console.error(body);
                }
            });
        }
    );

    req.on("error", err => {
        console.error(
            "DISPLAY SETTINGS API ERROR =",
            err
        );
    });
}

function sendToAllScreens(channel, data) {
    if (resolumeMode && resolume) {
        resolume.sendAll(channel, data);
        return;
    }

    screenWindows.forEach((window) => {
        if (!window.isDestroyed()) {
            window.webContents.send(channel, data);
        }
    });
}

function loadDefault(barId, targetDisplayIds = null) {
    console.log(`========== GET ${config.name} API ==========`);

    const token = getBarToken();

    if (!token) {
        console.error("BAR TOKEN NOT FOUND");
        return;
    }

    // Do not replace an active Gift / Queue playback with Default
    if (activePlaybackMode !== "default") {
        console.log(
            `SKIP DEFAULT UPDATE - CURRENT MODE = ${activePlaybackMode}`
        );
        return;
    }

    const url = `${config.displayApi}?bar_id=${barId}`;
    const client = url.startsWith("https") ? require("https") : require("http");

    console.log("BEFORE HTTP REQUEST");

    const req = client.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        (res) => {
            console.log("HTTP RESPONSE RECEIVED =", res.statusCode);

            console.log(`${config.name} API STATUS = ${res.statusCode}`);

            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                console.log(
                    `========== ${config.name} API RESPONSE ==========` 
                );
                console.log(body);

                let data;

                try {
                    data = JSON.parse(body);
                } catch (e) {
                    console.error("Invalid JSON:");
                    console.error(body);
                    return;
                }

                if (!data.displays || !data.displays.length) {
                    console.error(`${config.name} API: No displays`);
                    return;
                }

                if (activePlaybackMode !== "default") {
                    console.log(
                        `SKIP STALE DEFAULT RESPONSE - CURRENT MODE = ${activePlaybackMode}`
                    );
                    return;
                }

                const defaultDataString = JSON.stringify({
                    mode: data.mode,
                    interaction: data.interaction,
                    duration: data.duration,
                    displays: data.displays,
                });

                const shouldForceTargetDisplays =
                    Array.isArray(targetDisplayIds) &&
                    targetDisplayIds.length > 0;

                if (lastDefaultData === defaultDataString && !shouldForceTargetDisplays) {
                    return;
                }

                lastDefaultData = defaultDataString;

                console.log(`========== LOAD ${config.name} DEFAULT ==========`);

                console.log("MODE =", data.mode);
                console.log("DISPLAYS =", data.displays);

                const startAt = Date.now() + 100;

                eachDisplay((displayId) => {
                    if (targetDisplayIds && !targetDisplayIds.includes(Number(displayId))) {
                        return;
                    }

                    const display = data.displays.find(item => Number(item.id) === Number(displayId));

                    if (!display) {
                        return;
                    }

                    sendToDisplay(displayId, "play-layout", {
                        displays: [display],
                        displayId: Number(displayId),
                        mode: "default",
                        playlistId: null,
                        showcaseImageUrl: null,
                        nextPlaylist: null,
                        queue: [],
                        isMain: displayId === getPrimaryDisplayId(),
                        duration: data.duration,
                        startAt,
                    });

                });
            });
        }
    );

    req.on("error", (err) => {
        console.error(`${config.name} API ERROR =`, err);
    });
}

function loadRankBoard(period = "daily") {
    console.log(`========== GET ${config.name} RANKBOARD ==========`);
    const token = getBarToken();

    if (!token) {
        console.error("BAR TOKEN NOT FOUND FOR RANKBOARD");
        return;
    }

    const url = `${config.appApi}/rankboard/display?period=${period}`;
    const client = url.startsWith("https") ? require("https") : require("http");

    console.log("BEFORE HTTP REQUEST");

    const req = client.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        },
        (res) => {
            console.log("HTTP RESPONSE RECEIVED =", res.statusCode);

            console.log(`RANKBOARD API STATUS = ${res.statusCode}`);

            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    console.log("RANKBOARD =", data);

                    if (data.success) {
                        sendToAllScreens("rankboard-update", {
                            period,
                            ranking: data.ranking ?? [],
                        });
                    }
                } catch (error) {
                    console.error("RANKBOARD JSON ERROR =", error);
                    console.error(body);
                }
            });
        }
    );

    req.on("error", err => {
        console.error("RANKBOARD API ERROR =", err);
    });
}

function loadRankBoardSettings(displayId) {
    const token = getBarToken();

    if (!token) {
        console.error("BAR TOKEN NOT FOUND");
        return;
    }

    const url =
        `${config.appApi}/rankboard/settings?display_id=${displayId}`;

    const client = url.startsWith("https")
        ? require("https")
        : require("http");

    console.log("BEFORE HTTP REQUEST");

    const req = client.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        },
        (res) => {
            console.log("HTTP RESPONSE RECEIVED =", res.statusCode);

            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    const data = JSON.parse(body);

                    if (!data.success) {
                        console.error(
                            `RANK SETTINGS FAILED DISPLAY ${displayId}`,
                            data
                        );
                        return;
                    }

                    sendToDisplay(
                        displayId,
                        "rankboard-settings-update",
                        data
                    );

                } catch (error) {
                    console.error(
                        "RANK SETTINGS JSON ERROR =",
                        error
                    );
                    console.error(body);
                }
            });
        }
    );

    req.on("error", err => {
        console.error(
            `RANK SETTINGS API ERROR DISPLAY ${displayId} =`,
            err
        );
    });
}

function loadScreenSettings() {
    console.log(`========== GET ${config.name} SCREEN SETTINGS ==========`);

    const token = getBarToken();
    if (!token) {
        console.error("BAR TOKEN NOT FOUND FOR SCREEN SETTINGS");
        return;
    }

    const url = `${config.appApi}/screen/settings`;
    const client = url.startsWith("https") ? require("https") : require("http");

    console.log("BEFORE HTTP REQUEST");

    const req = client.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        },
        (res) => {
            console.log("HTTP RESPONSE RECEIVED =", res.statusCode);

            console.log(`SCREEN SETTINGS API STATUS = ${res.statusCode}`);

            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    console.log("SCREEN SETTINGS =", data);

                    if (data.success) {
                        sendToAllScreens(
                            "screen-settings-update",
                            data.settings
                        );
                    }
                } catch (error) {
                    console.error("SCREEN SETTINGS JSON ERROR =", error);
                    console.error(body);
                }
            });
        }
    );

    req.on("error", (err) => {
        console.error("SCREEN SETTINGS API ERROR =", err);
    });
}

function connectWebSocket() {
    if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
         ws.readyState === WebSocket.CONNECTING)
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

        if (pendingQueueFinished) {
            console.log("SEND RECONNECT STATE =", pendingQueueFinished);
            ws.send(JSON.stringify({
                type: "reconnect",
                playlistId: pendingQueueFinished
            }));
            pendingQueueFinished = null;
        } else {
            ws.send(JSON.stringify({
                type: "reconnect",
                playlistId: null
            }));
        }
    });

    ws.on("message", (message) => {
        console.log(`========== ${config.name} WS MESSAGE ==========`); 
        console.log(message.toString());

        try {
            const data = JSON.parse(message);

            if (data.type === "play-layout") {

                console.log("========== QUEUE PLAY ==========");
                console.log("MODE =", data.mode);
                console.log("SCREENS =", data.screens);

                const startAt = Date.now() + 100;

                const playbackMode = data.mode || "queue";

                activePlaybackMode = playbackMode;

                console.log("ACTIVE PLAYBACK MODE =", activePlaybackMode);

                if (!data.screens || !data.screens.length) {
                    console.error("QUEUE: No screens");
                    return;
                }

                if (playbackMode !== "default") {
                    loadRankBoards();
                }

                eachDisplay((displayId) => {
                    const display = data.screens.find(
                        item => Number(item.id ?? item.display_id) === Number(displayId)
                    );

                    if (!display) {
                        return;
                    }

                    sendToDisplay(displayId, "play-layout", {
                        displays: [display],
                        displayId: Number(displayId),

                        mode: playbackMode,

                        playlistId: playbackMode === "queue"
                            ? (data.playlistId ?? data.playlist_id ?? null)
                            : null,

                        showcaseImageUrl: playbackMode === "queue"
                            ? (data.showcaseImageUrl || null)
                            : null,

                        nextPlaylist: data.nextPlaylist ?? null,

                        queue: Array.isArray(data.queue)
                            ? data.queue
                            : [],

                        isMain: displayId === getPrimaryDisplayId(),

                        duration: data.duration,
                        startAt,
                    });
               
                });
            }
        } catch (err) {
            console.error(
                `[${config.name} WS JSON ERROR] ${err.message}`
            );
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

function startMain(barId, options = {}) {
    console.log("MAIN BAR ID =", barId);

    resolumeMode = !!options.resolume;

    if (resolumeMode) {
        resolume = require("./resolume");
        resolume.start({
            onQueueFinished: handleQueueFinished,
        });
        console.log("RESOLUME OUTPUT ENABLED");
    }

    loadDisplays(barId);

    setInterval(() => {
        loadDefault(barId);
    }, DEFAULT_POLL_MS);

    setInterval(() => {
        loadRankBoards();
    }, RANK_POLL_MS);

    setInterval(() => {
        loadDisplays(barId);
        loadAllRankSettings();
    }, SCREEN_POLL_MS);

    ipcMain.on("queue-finished", (event, data) => {
        handleQueueFinished(data?.playlistId);
    });
}

module.exports = {
    startMain
};