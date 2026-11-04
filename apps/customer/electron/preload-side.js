const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    onLayout: (callback) => {
        ipcRenderer.on("play-layout", (event, data) => {
            callback(data);
        });
    },

    onDefaultPlay: (callback) => {
        ipcRenderer.on("default-play", () => {
            callback();
        });
    },

    sendMessage: (data) => {
        ipcRenderer.send("queue-finished", data);
    },

    animationEnded: () => {
        ipcRenderer.send("animation-ended");
    }
});
