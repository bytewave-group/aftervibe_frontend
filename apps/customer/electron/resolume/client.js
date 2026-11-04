const http = require("http");
const https = require("https");

const DEFAULT_BASE_URL = "http://127.0.0.1:8090/api/v1";

function buildUrl(baseUrl, pathname) {
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(String(pathname).replace(/^\//, ""), base);
}

function createClient(baseUrl = DEFAULT_BASE_URL) {
    const readyListeners = [];
    let online = false;
    let retryDelay = 2000;
    let retryTimer = null;

    function request(method, pathname, timeout = 3000) {
        const url = buildUrl(baseUrl, pathname);
        const lib = url.protocol === "https:" ? https : http;

        return new Promise((resolve, reject) => {
            const req = lib.request(url, { method }, (res) => {
                let raw = "";

                res.on("data", (chunk) => {
                    raw += chunk;
                });

                res.on("end", () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(
                            `${method} ${url.pathname} failed: ${res.statusCode} ${raw}`
                        ));
                        return;
                    }

                    if (!raw) {
                        resolve(null);
                        return;
                    }

                    try {
                        resolve(JSON.parse(raw));
                    } catch (error) {
                        resolve(raw);
                    }
                });
            });

            req.setTimeout(timeout, () => {
                req.destroy(new Error("Resolume API timeout"));
            });

            req.on("error", reject);
            req.end();
        });
    }

    function assertClipIndex(value, label) {
        const index = Number(value);

        if (!Number.isInteger(index) || index < 1) {
            throw new Error(`Invalid Resolume ${label}: ${value}`);
        }

        return index;
    }

    function connectClip(layer, clip) {
        const layerIndex = assertClipIndex(layer, "layer");
        const clipIndex = assertClipIndex(clip, "clip");

        return request(
            "POST",
            `composition/layers/${layerIndex}/clips/${clipIndex}/connect`
        );
    }

    function onReady(listener) {
        readyListeners.push(listener);

        if (online) {
            listener();
        }
    }

    async function tick() {
        try {
            const product = await request("GET", "product");

            if (!online) {
                online = true;
                retryDelay = 2000;
                console.log("RESOLUME PRODUCT =", JSON.stringify(product));
                readyListeners.forEach((listener) => {
                    try {
                        listener(product);
                    } catch (error) {
                        console.error(
                            "RESOLUME READY LISTENER FAILED =",
                            error.message
                        );
                    }
                });
            }

            retryTimer = setTimeout(tick, 15000);
        } catch (error) {
            online = false;
            console.error("RESOLUME OFFLINE =", error.message);
            retryTimer = setTimeout(tick, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 15000);
        }
    }

    function watchProduct() {
        if (retryTimer) {
            return;
        }

        tick();
    }

    return {
        baseUrl,
        connectClip,
        onReady,
        watchProduct,
        request,
    };
}

module.exports = {
    DEFAULT_BASE_URL,
    buildUrl,
    createClient,
};
