const path = require("path");
const { app } = require("electron");
const { createClient } = require("./client");
const { indexComposition, layerForDisplay, loadResolumeMap, lookupClip } = require("./map");
const { createPlayer } = require("./player");
const { createOverlayHost } = require("./overlay");

const examplePath = path.join(__dirname, "..", "resolume-map.example.json");

let host = null;

function start({ onQueueFinished } = {}) {
    const map = loadResolumeMap(app.getPath("userData"), examplePath);
    const client = createClient(map.baseUrl);
    let catalog = indexComposition(null);
    let refreshedAt = 0;
    let loggedClips = "";
    let refreshTask = null;

    function refreshComposition() {
        if (refreshTask) {
            return refreshTask;
        }

        refreshTask = client.request("GET", "composition", 8000)
            .then((body) => {
                catalog = indexComposition(body);
                refreshedAt = Date.now();

                const next = catalog.lines.join(" | ");

                if (next !== loggedClips) {
                    loggedClips = next;
                    console.log("RESOLUME CLIP NAMES =", next || "(none)");
                    catalog.duplicates.forEach((clip) => {
                        console.error(
                            `RESOLUME CLIP DUPLICATE LAYER ${clip.layer} NAME ${clip.name}`
                        );
                    });
                }
            })
            .catch((error) => {
                refreshedAt = Date.now();
                console.error("RESOLUME COMPOSITION FAILED =", error.message);
            })
            .finally(() => {
                refreshTask = null;
            });

        return refreshTask;
    }

    async function findClip(displayId, animationName) {
        if (Date.now() - refreshedAt > 15000) {
            await refreshComposition();
        }

        let clip = lookupClip(map, catalog, displayId, animationName);

        if (!clip && Date.now() - refreshedAt > 1000) {
            await refreshComposition();
            clip = lookupClip(map, catalog, displayId, animationName);
        }

        return clip;
    }

    client.onReady(() => {
        refreshComposition();
    });

    const player = createPlayer({
        findClip,
        client,
        onQueueFinished,
    });
    const overlays = createOverlayHost({
        getMap: () => map,
        client,
        onDisplayRemoved: (displayId) => player.stopDisplay(displayId),
    });

    client.watchProduct();

    host = {
        map,
        client,
        player,
        overlays,
    };

    console.log("RESOLUME BASE URL =", map.baseUrl);
    overlays.openFromMap();
}

function syncDisplays(displays) {
    const result = host.overlays.syncDisplays(displays);

    result.addedDisplayIds.forEach((displayId) => {
        const layer = layerForDisplay(host.map, displayId);

        if (!layer) {
            return;
        }

        const configured = host.map.displays?.[String(displayId)]?.layer;

        console.log(
            configured
                ? `RESOLUME DISPLAY ${displayId} LAYER ${layer}`
                : `RESOLUME DISPLAY ${displayId} LAYER ${layer} FROM SCREEN`
        );
    });

    return result;
}

function whenLoaded(ids, callback) {
    host.overlays.whenLoaded(ids, callback);
}

function play(displayId, payload) {
    host.player.play(displayId, payload);
}

function send(displayId, channel, data) {
    host.overlays.send(displayId, channel, data);
}

function sendAll(channel, data) {
    host.overlays.sendAll(channel, data);
}

function getDisplayIds() {
    return host.overlays.getDisplayIds();
}

function getPrimaryDisplayId() {
    return host.overlays.getPrimaryDisplayId();
}

module.exports = {
    start,
    syncDisplays,
    whenLoaded,
    play,
    send,
    sendAll,
    getDisplayIds,
    getPrimaryDisplayId,
};
