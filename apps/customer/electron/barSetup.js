const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const config = require("./config");

const BAR_CONFIG_FILE = path.join(app.getPath("userData"), "bar-config.json");

function getSavedBarId() {
    try {
        if (!fs.existsSync(BAR_CONFIG_FILE)) {
            return null;
        }

        const data = JSON.parse(fs.readFileSync(BAR_CONFIG_FILE, "utf8"));
        return data.bar_id || null;
    } catch (error) {
        console.error("Failed to read Bar config:", error);
        return null;
    }
}

function fetchBars(apiUrl) {
    return new Promise((resolve, reject) => {
        const client = apiUrl.slice(0, 5) === "https" ? https : http;

        client.get(`${apiUrl}/bars`, (res) => {
            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`GET /bars failed: ${res.statusCode}`));
                    return;
                }

                try {
                    const data = JSON.parse(body);
                    resolve(data.bars || data);
                } catch (error) {
                    reject(error);
                }
            });
        }).on("error", reject);
    });
}

function createSetupWindow(bars, savedBarId) {
    const window = new BrowserWindow({
        width: 500,
        height: 400,
        resizable: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload-barSetup.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        }
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>After Vibe Setup</title>
            <style>
                body {
                    margin: 0;
                    padding: 40px;
                    background: radial-gradient(circle, #2B1D46 0%, #17162A 55%, #0C0C15 100%);
                    color: white;
                    font-family: Arial, sans-serif;
                }
                h2 {
                    margin-top: 0;
                    color: #FF5FA2;
                }
                p {
                    color: rgba(255,255,255,.65);
                }
                select {
                    width: 100%;
                    height: 48px;
                    padding: 0 12px;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                }
                button {
                    width: 100%;
                    height: 48px;
                    margin-top: 25px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(90deg, #FF5FA2, #8B5CF6);
                    color: white;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <h2>After Vibe Setup</h2>
            <p>Select the Bar for this Electron.</p>
            <select id="bar">
                ${bars.map(bar => `
                    <option value="${bar.id}" ${Number(bar.id) === Number(savedBarId) ? "selected" : ""}>
                        ${bar.name}
                    </option>
                `).join("")}
            </select>
            <button onclick="connectBar()">Connect</button>
            <script>
                function connectBar() {
                    const barId = document.getElementById("bar").value;
                    window.barSetup.save(barId);
                }
            </script>
        </body>
        </html>
        `;

    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return window;
}

async function registerBar(apiUrl, barId) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            bar_id: Number(barId),
            node_url: "http://127.0.0.1:8080",
        });
        const client = apiUrl.startsWith("https") ? https : http;

        const url = new URL(`${apiUrl}/node/register`);

        const req = client.request(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
            },
        }, (res) => {
            let body = "";

            res.on("data", chunk => {
                body += chunk;
            });

            res.on("end", () => {
                if (res.statusCode !== 200) {
                    reject(
                        new Error(
                            `POST /node/register failed: ${res.statusCode} ${body}`
                        )
                    );
                    return;
                }

                try {
                    const result = JSON.parse(body);
                    if (!result.success || !result.token) {
                        reject(new Error("Bar registration failed."));
                        return;
                    }
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on("error", reject);

        req.write(data);
        req.end();
    });
}

async function setupBar() {
    const savedBarId = getSavedBarId();

    console.log("========== SELECT BAR ==========");

    const bars = await fetchBars(config.appApi);

    if (!bars.length) {
        throw new Error("No active Bars found.");
    }

    return new Promise((resolve, reject) => {
        const setupWindow = createSetupWindow(bars, savedBarId);
        let settled = false;

        const finish = (error, barId) => {
            if (settled) {
                return;
            }

            settled = true;
            ipcMain.removeAllListeners("bar-setup-save");

            if (error) {
                reject(error);
                return;
            }

            resolve(barId);
        };

        setupWindow.on("closed", () => {
            finish(new Error("Bar setup closed."));
        });

        ipcMain.once("bar-setup-save", async (event, barId) => {
            try {
                const result = await registerBar(
                    config.appApi,
                    Number(barId)
                );

                fs.writeFileSync(
                    BAR_CONFIG_FILE,
                    JSON.stringify({
                        bar_id: result.bar_id,
                        bar_token: result.token,
                    })
                );

                console.log("BAR CONFIG FILE =", BAR_CONFIG_FILE);
                console.log("BAR TOKEN RECEIVED =", !!result.token);
                console.log("BAR SAVED =", result.bar_id);

                setupWindow.hide();
                finish(null, Number(result.bar_id));

            } catch (error) {
                console.error("BAR REGISTER FAILED =", error);
                finish(error);
            }
        });
    });
}

module.exports = {
    setupBar,
    getSavedBarId,
};