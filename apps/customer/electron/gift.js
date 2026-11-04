const { app, BrowserWindow } = require("electron");
const path = require("path");

let giftWindow;

function createGiftWindow() {
    const isDev = !app.isPackaged;

    giftWindow = new BrowserWindow({
        title: "AfterVibe Gift",
        width: 480,
        height: 480,
        x: 760,
        y: 20,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload-gift.js"),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
        }
    });

    // Set window bounds and position if needed here

    giftWindow.removeMenu();

    if (isDev) {
        const isLive = process.argv.includes("--live");
        const env = isLive ? "live" : "local";

        giftWindow.loadURL(
            `http://localhost:5173/#/gift?env=${env}`
        );

        giftWindow.webContents.openDevTools({
            mode: "detach"
        });

    } else {

        giftWindow.loadFile(
            path.join(__dirname, "../dist/index.html"),
            {
                hash: "/gift"
            }
        );

    }

    giftWindow.webContents.once("did-finish-load", () => {
        console.log("Gift Renderer Ready");
    });
}

function startGift() {
    createGiftWindow();
    if (giftWindow && giftWindow.webContents) {
        giftWindow.webContents.setBackgroundThrottling(false);
    }
}

module.exports = {
    startGift
};