const fs = require("fs");
const path = require("path");

const DEFAULT_BASE_URL = "http://127.0.0.1:8090/api/v1";
const VIDEO_EXT = /\.(mp4|mov|webm|avi|mkv|m4v|gif)$/i;

function paramValue(field) {
    if (typeof field === "string") {
        return field.trim();
    }

    if (typeof field?.value === "string") {
        return field.value.trim();
    }

    return "";
}

function normalizeLayer(value) {
    const layer = Number(value);

    if (!Number.isInteger(layer) || layer < 1) {
        return null;
    }

    return layer;
}

function normalizeClip(entry) {
    const layer = Number(entry?.layer);
    const clip = Number(entry?.clip);

    if (!Number.isInteger(layer) || layer < 1) {
        return null;
    }

    if (!Number.isInteger(clip) || clip < 1) {
        return null;
    }

    return { layer, clip };
}

function normalizeOverlay(entry) {
    const clip = normalizeClip(entry);
    const sender = typeof entry?.sender === "string" ? entry.sender.trim() : "";

    if (!clip || !sender) {
        return null;
    }

    const width = Number(entry?.width);
    const height = Number(entry?.height);

    return {
        layer: clip.layer,
        clip: clip.clip,
        sender,
        width: Number.isInteger(width) && width > 0 ? width : null,
        height: Number.isInteger(height) && height > 0 ? height : null,
    };
}

function sanitizeMap(raw) {
    const baseUrl = typeof raw?.baseUrl === "string" && raw.baseUrl.trim()
        ? raw.baseUrl.trim()
        : DEFAULT_BASE_URL;

    const displays = {};
    const source = raw?.displays && typeof raw.displays === "object"
        ? raw.displays
        : {};

    Object.entries(source).forEach(([displayId, display]) => {
        let layer = normalizeLayer(display?.layer);
        const clipSource = display?.clips && typeof display.clips === "object"
            ? display.clips
            : null;

        if (!layer && clipSource) {
            const layers = new Set();

            Object.values(clipSource).forEach((entry) => {
                const clip = normalizeClip(entry);

                if (clip) {
                    layers.add(clip.layer);
                }
            });

            if (layers.size === 1) {
                layer = [...layers][0];
                console.log(
                    `RESOLUME MAP CLIP INDEXES IGNORED DISPLAY ${displayId} LAYER ${layer}`
                );
            } else if (layers.size > 1) {
                console.log(
                    `RESOLUME MAP CLIP INDEXES IGNORED DISPLAY ${displayId}`
                );
            }
        }

        let overlay = null;

        if (display?.overlay) {
            overlay = normalizeOverlay(display.overlay);

            if (!overlay) {
                console.error(
                    `RESOLUME MAP INVALID OVERLAY DISPLAY ${displayId}`
                );
            }
        }

        displays[String(displayId)] = { layer, overlay };
    });

    return { baseUrl, displays };
}

function loadResolumeMap(userDataPath, examplePath) {
    const target = path.join(userDataPath, "resolume-map.json");

    if (!fs.existsSync(target)) {
        fs.mkdirSync(userDataPath, { recursive: true });

        if (examplePath && fs.existsSync(examplePath)) {
            fs.copyFileSync(examplePath, target);
        } else {
            fs.writeFileSync(
                target,
                JSON.stringify({
                    baseUrl: DEFAULT_BASE_URL,
                    displays: {},
                }, null, 2)
            );
        }

        console.log("RESOLUME MAP CREATED =", target);
        console.log("RESOLUME MAP MATCHES CLIP NAMES. EACH SCREEN USES THE SAME LAYER NUMBER.");
    }

    try {
        const raw = JSON.parse(fs.readFileSync(target, "utf8"));
        const map = sanitizeMap(raw);

        console.log("RESOLUME MAP =", target);
        console.log("RESOLUME DISPLAYS =", Object.keys(map.displays));
        applyExampleOverlays(map, examplePath, target);

        return map;
    } catch (error) {
        console.error("RESOLUME MAP READ FAILED =", error.message);
        return sanitizeMap(null);
    }
}

function rememberClip(names, exact, name, target) {
    names.set(name, target);
    exact.add(name);

    const stem = name.replace(VIDEO_EXT, "");

    if (stem !== name && !exact.has(stem) && !names.has(stem)) {
        names.set(stem, target);
    }
}

function indexComposition(composition) {
    const layers = Array.isArray(composition?.layers) ? composition.layers : [];
    const byLayer = new Map();
    const lines = [];
    const duplicates = [];

    layers.forEach((layer, layerOffset) => {
        const layerIndex = layerOffset + 1;
        const names = new Map();
        const exact = new Set();
        const listed = [];
        const clips = Array.isArray(layer?.clips) ? layer.clips : [];

        clips.forEach((clip, clipOffset) => {
            const connected = paramValue(clip?.connected);

            if (connected === "Empty") {
                return;
            }

            const name = paramValue(clip?.name);

            if (!name) {
                return;
            }

            const target = {
                layer: layerIndex,
                clip: clipOffset + 1,
                name,
            };

            if (exact.has(name)) {
                duplicates.push({ layer: layerIndex, name });
                return;
            }

            rememberClip(names, exact, name, target);
            listed.push(name);
        });

        byLayer.set(layerIndex, names);

        if (listed.length) {
            lines.push(`${layerIndex}: ${listed.join(", ")}`);
        }
    });

    return { byLayer, lines, duplicates };
}

function layerForDisplay(map, displayId) {
    const configured = map?.displays?.[String(displayId)]?.layer;

    if (configured) {
        return configured;
    }

    return normalizeLayer(displayId);
}

function lookupClip(map, catalog, displayId, animationName) {
    const name = typeof animationName === "string" ? animationName.trim() : "";

    if (!name || !catalog) {
        return null;
    }

    const layer = layerForDisplay(map, displayId);

    if (layer) {
        const clip = catalog.byLayer.get(layer)?.get(name);

        if (!clip) {
            return null;
        }

        return { layer: clip.layer, clip: clip.clip, name: clip.name };
    }

    const matches = [];

    catalog.byLayer.forEach((names) => {
        const clip = names.get(name);

        if (clip && !matches.some((item) => item.layer === clip.layer && item.clip === clip.clip)) {
            matches.push(clip);
        }
    });

    if (matches.length === 1) {
        return {
            layer: matches[0].layer,
            clip: matches[0].clip,
            name: matches[0].name,
        };
    }

    if (matches.length > 1) {
        return {
            ambiguous: true,
            layers: matches.map((clip) => clip.layer),
        };
    }

    return null;
}

function overlayRecord(overlay) {
    const record = {
        layer: overlay.layer,
        clip: overlay.clip,
        sender: overlay.sender,
    };

    if (overlay.width) {
        record.width = overlay.width;
    }

    if (overlay.height) {
        record.height = overlay.height;
    }

    return record;
}

function applyExampleOverlays(map, examplePath, target) {
    if (!examplePath || !fs.existsSync(examplePath)) {
        return;
    }

    let example;

    try {
        example = sanitizeMap(JSON.parse(fs.readFileSync(examplePath, "utf8")));
    } catch (error) {
        console.error("RESOLUME EXAMPLE MAP READ FAILED =", error.message);
        return;
    }

    let changed = false;

    Object.entries(example.displays).forEach(([displayId, display]) => {
        if (!display.overlay) {
            return;
        }

        const current = map.displays[displayId];

        if (!current) {
            map.displays[displayId] = {
                layer: display.layer,
                overlay: display.overlay,
            };
            changed = true;
            return;
        }

        if (!current.overlay) {
            current.overlay = display.overlay;

            if (!current.layer) {
                current.layer = display.layer;
            }

            changed = true;
        }
    });

    if (!changed) {
        return;
    }

    const displays = {};

    Object.entries(map.displays).forEach(([displayId, display]) => {
        const record = {};

        if (display.layer) {
            record.layer = display.layer;
        }

        if (display.overlay) {
            record.overlay = overlayRecord(display.overlay);
        }

        displays[displayId] = record;
    });

    fs.writeFileSync(
        target,
        JSON.stringify({
            baseUrl: map.baseUrl,
            displays,
        }, null, 2)
    );
    console.log("RESOLUME MAP OVERLAY ADDED =", target);
}

function lookupOverlay(map, displayId) {
    if (!map) {
        return null;
    }

    return map.displays?.[String(displayId)]?.overlay || null;
}

module.exports = {
    DEFAULT_BASE_URL,
    indexComposition,
    layerForDisplay,
    loadResolumeMap,
    lookupClip,
    lookupOverlay,
    normalizeClip,
    sanitizeMap,
};
