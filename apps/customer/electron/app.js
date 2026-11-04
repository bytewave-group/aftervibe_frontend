const { app, ipcMain } = require("electron");
const { startMain } = require("./main");
const { startGift } = require("./gift");
const { setupBar } = require("./barSetup");
const config = require("./config");
// require("./websocket-server");

let appStarted = false;

app.whenReady().then(async () => {

    try {

        const barId = await setupBar(config.api);

        console.log("========== BAR READY ==========");
        console.log("BAR ID =", barId);

        appStarted = true;

        const resolume = app.isPackaged || process.argv.includes("--resolume");

        console.log("RESOLUME =", resolume);

        startMain(barId, {
            resolume,
        });

    } catch (error) {
        console.error("========== BAR SETUP FAILED ==========");
        console.error(error);
        app.quit();
    }

});

ipcMain.on("animation-ended", async () => {

    console.log("Animation Ended");

    try {
        const response = await fetch(
            `${config.appApi}/animations/videoEnded`,
            {
                method: "POST"
            }
        );

        console.log(
            "VIDEO ENDED API STATUS =",
            response.status
        );

    } catch (error) {
        console.error("VIDEO ENDED API ERROR =", error);
    }

});

app.on("window-all-closed", () => {

    console.log("========== ALL WINDOWS CLOSED ==========");
    console.log("APP STARTED =", appStarted);

    if (process.platform !== "darwin" && appStarted) {
        console.log("========== WOULD QUIT ==========");
        console.trace();
        // app.quit();
    }

});