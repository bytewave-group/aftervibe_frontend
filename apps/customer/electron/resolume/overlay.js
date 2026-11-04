const { BrowserWindow, app } = require("electron");
const path = require("path");
const { lookupOverlay } = require("./map");
const { createSender } = require("./sender");

const MAX_WIDTH = 7680;
const MAX_HEIGHT = 4320;

function displaySize(display) {
    const width = Math.min(
        MAX_WIDTH,
        Math.max(1, Math.round(Number(display.width) || 1920))
    );
    const height = Math.min(
        MAX_HEIGHT,
        Math.max(1, Math.round(Number(display.height) || 1080))
    );

    return { width, height };
}

function createOverlayHost({ getMap, client, onDisplayRemoved }) {
    const windows = new Map();
    const knownIds = new Set();
    const order = [];
    const overlayWarnings = new Set();

    function connectOverlay(displayId) {
        const overlay = lookupOverlay(getMap(), displayId);

        if (!overlay) {
            return;
        }

        client.connectClip(overlay.layer, overlay.clip).then(() => {
            console.log(
                "RESOLUME OVERLAY CONNECT =",
                displayId,
                overlay.layer,
                overlay.clip,
                overlay.sender
            );
        }).catch((error) => {
            console.error(
                "RESOLUME OVERLAY CONNECT FAILED =",
                displayId,
                error.message
            );
        });
    }

    client.onReady(() => {
        windows.forEach((record, displayId) => {
            connectOverlay(displayId);
        });
    });

    function loadOverlay(window, display) {
        const isDev = !app.isPackaged;

        if (isDev) {
            const env = process.argv.includes("--live") ? "live" : "local";
            window.loadURL(
                `http://localhost:5173/#/overlay?env=${env}&display_id=${display.id}`
            );
            return;
        }

        window.loadFile(
            path.join(__dirname, "../../dist/index.html"),
            {
                hash: `/overlay?env=live&display_id=${display.id}`,
            }
        );
    }

    function ensureOverlay(display) {
        const displayId = Number(display.id);
        const existing = windows.get(displayId);

        if (existing) {
            const overlay = lookupOverlay(getMap(), displayId);
            const size = displaySize({
                width: overlay?.width || display.width,
                height: overlay?.height || display.height,
            });
            const bounds = existing.win.getBounds();

            if (bounds.width !== size.width || bounds.height !== size.height) {
                existing.win.setSize(size.width, size.height);
            }

            return !existing.loaded;
        }

        const overlay = lookupOverlay(getMap(), displayId);

        if (!overlay) {
            if (!overlayWarnings.has(displayId)) {
                overlayWarnings.add(displayId);
                console.error(`RESOLUME OVERLAY MISSING DISPLAY ${displayId}`);
            }

            return false;
        }

        const size = displaySize({
            width: overlay.width || display.width,
            height: overlay.height || display.height,
        });
        const sender = createSender(overlay.sender);

        const window = new BrowserWindow({
            title: `AfterVibe Rank ${displayId}`,
            width: size.width,
            height: size.height,
            show: false,
            frame: false,
            transparent: true,
            hasShadow: false,
            backgroundColor: "#00000000",
            autoHideMenuBar: true,
            webPreferences: {
                offscreen: true,
                preload: path.join(__dirname, "../preload-main.js"),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                backgroundThrottling: false,
            },
        });

        window.webContents.setBackgroundThrottling(false);
        window.webContents.setFrameRate(30);

        const record = {
            win: window,
            sender,
            loaded: false,
            captureTimer: null,
        };

        const markLoaded = () => {
            record.loaded = true;
            connectOverlay(displayId);
        };

        const publishFrame = (image) => {
            try {
                sender.send(image);
            } catch (error) {
                console.error(
                    "RESOLUME SENDER FRAME FAILED =",
                    overlay.sender,
                    error.message
                );
            }
        };

        window.webContents.on("paint", (event, dirty, image) => {
            publishFrame(image);
        });

        window.webContents.on("render-process-gone", (event, details) => {
            console.error(
                "RESOLUME OVERLAY PROCESS GONE =",
                displayId,
                details.reason
            );
        });

        window.webContents.once("did-finish-load", () => {
            try {
                window.webContents.startPainting();
            } catch (error) {
                console.error(
                    "RESOLUME OVERLAY PAINT FAILED =",
                    displayId,
                    error.message
                );
            }

            markLoaded();
            console.log(
                "RESOLUME OVERLAY READY =",
                displayId,
                `${size.width}x${size.height}`
            );
        });

        window.webContents.on(
            "did-fail-load",
            (event, errorCode, errorDescription, validatedURL) => {
                record.loaded = true;
                console.error("========== OVERLAY LOAD FAILED ==========");
                console.error("DISPLAY ID =", displayId);
                console.error("ERROR CODE =", errorCode);
                console.error("ERROR =", errorDescription);
                console.error("URL =", validatedURL);
            }
        );

        window.on("closed", () => {
            clearInterval(record.captureTimer);

            if (windows.get(displayId)?.win === window) {
                windows.delete(displayId);
            }

            sender.close();
        });

        windows.set(displayId, record);
        sender.open(size.width, size.height);

        loadOverlay(window, display);
        console.log(
            `CREATE OVERLAY DISPLAY ${displayId}`,
            overlay.sender,
            `${size.width}x${size.height}`
        );

        return true;
    }

    function closeDisplay(displayId) {
        const record = windows.get(displayId);
        windows.delete(displayId);
        overlayWarnings.delete(displayId);

        if (typeof onDisplayRemoved === "function") {
            onDisplayRemoved(displayId);
        }

        if (!record) {
            return;
        }

        clearInterval(record.captureTimer);
        record.sender.close();
        record.sender = {
            send() {},
            close() {},
        };

        if (!record.win.isDestroyed()) {
            record.win.removeAllListeners("closed");
            record.win.close();
        }
    }

    function syncDisplays(displays) {
        const active = new Set();
        const addedDisplayIds = [];
        const pendingWindows = [];
        const nextOrder = [];

        displays.forEach((display) => {
            const displayId = Number(display.id);

            if (!Number.isFinite(displayId)) {
                return;
            }

            active.add(displayId);
            nextOrder.push(displayId);

            if (!knownIds.has(displayId)) {
                knownIds.add(displayId);
                addedDisplayIds.push(displayId);
                console.log(`CREATE SCREEN DISPLAY ${displayId}`);
            }

            if (ensureOverlay(display)) {
                pendingWindows.push(displayId);
            }
        });

        [...knownIds].forEach((displayId) => {
            if (!active.has(displayId) && !lookupOverlay(getMap(), displayId)) {
                console.log("REMOVE SCREEN DISPLAY", displayId);
                knownIds.delete(displayId);
                closeDisplay(displayId);
            }
        });

        Object.keys(getMap()?.displays || {}).forEach((id) => {
            const displayId = Number(id);

            if (!lookupOverlay(getMap(), displayId)) {
                return;
            }

            knownIds.add(displayId);

            if (!nextOrder.includes(displayId)) {
                nextOrder.push(displayId);
            }
        });

        order.splice(
            0,
            order.length,
            ...nextOrder.filter((displayId) => knownIds.has(displayId))
        );

        return { addedDisplayIds, pendingWindows };
    }

    function openFromMap() {
        const displays = getMap()?.displays || {};

        Object.entries(displays).forEach(([id, display]) => {
            if (!display?.overlay) {
                return;
            }

            const displayId = Number(id);
            knownIds.add(displayId);

            if (!order.includes(displayId)) {
                order.push(displayId);
            }

            ensureOverlay({
                id: displayId,
                width: display.overlay.width || 1280,
                height: display.overlay.height || 720,
            });
        });
    }

    function whenLoaded(ids, callback) {
        const pending = [...ids];

        if (!pending.length) {
            callback();
            return;
        }

        let remaining = pending.length;

        const finishOne = () => {
            remaining -= 1;

            if (remaining === 0) {
                callback();
            }
        };

        pending.forEach((displayId) => {
            const record = windows.get(Number(displayId));

            if (!record || record.loaded || record.win.isDestroyed()) {
                finishOne();
                return;
            }

            let settled = false;
            const finish = () => {
                if (settled) {
                    return;
                }

                settled = true;
                finishOne();
            };

            record.win.webContents.once("did-finish-load", finish);
            record.win.webContents.once("did-fail-load", finish);
        });
    }

    function send(displayId, channel, data) {
        const record = windows.get(Number(displayId));

        if (!record || record.win.isDestroyed()) {
            return;
        }

        record.win.webContents.send(channel, data);
    }

    function sendAll(channel, data) {
        windows.forEach((record) => {
            if (!record.win.isDestroyed()) {
                record.win.webContents.send(channel, data);
            }
        });
    }

    return {
        syncDisplays,
        openFromMap,
        whenLoaded,
        send,
        sendAll,
        getDisplayIds() {
            return [...order];
        },
        getPrimaryDisplayId() {
            return order[0] ?? null;
        },
    };
}

module.exports = {
    createOverlayHost,
};
