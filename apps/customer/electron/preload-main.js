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

    onRankBoard: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on("rankboard-update", listener);
        return () => ipcRenderer.removeListener("rankboard-update", listener);
    },
    
    onScreenSettings: (callback) => {
        const listener = (_, data) => callback(data);
    
        ipcRenderer.on("screen-settings-update", listener);
    
        return () =>
            ipcRenderer.removeListener(
                "screen-settings-update",
                listener
            );
    },
    
    onRankBoardSettings: (callback) => {
        const listener = (_, data) => callback(data);
    
        ipcRenderer.on("rankboard-settings-update", listener);
    
        return () =>
            ipcRenderer.removeListener(
                "rankboard-settings-update",
                listener
            );
    },
    
    onVisualEffect: (callback) => {
        const listener = (_, data) => callback(data);
    
        ipcRenderer.on("visual-effect-update", listener);
    
        return () =>
            ipcRenderer.removeListener(
                "visual-effect-update",
                listener
            );
    },
    
    sendMessage: (data) => {
        ipcRenderer.send("queue-finished", data);
    },

    animationEnded: (data) => {
        ipcRenderer.send("animation-ended");
    }
});
